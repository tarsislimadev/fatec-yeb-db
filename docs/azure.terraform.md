# Azure deployment with Terraform — plan for fatec-yeb-db

This document describes a practical Terraform-first plan to publish the
`fatec-yeb-db` project to Azure. It focuses on immutable container images
(backend + frontend) stored in Azure Container Registry (ACR) and services
using managed Azure resources: Azure Database for PostgreSQL (Flexible),
Azure Cache for Redis, Key Vault, and Container Apps.

Goals
- Store and run production images for `backend` and `frontend` in ACR.
- Run the app in Azure Container Apps (one app for backend, one for frontend),
  with secrets in Key Vault and images pulled securely from ACR.
- Managed Postgres and Redis instead of self-hosted containers.
- CI pipeline to build, tag, push images and run Terraform (using OIDC).

Prerequisites
- An Azure subscription and an account with Owner or Contributor rights.
- `az` CLI and `terraform` installed locally or in CI.
- GitHub repo with Actions enabled (recommended) or other CI.

High-level sequence
1. Bootstrap remote state (Storage Account + Container) used by Terraform.
2. Create Terraform skeleton in `terraform/` (provider, modules, envs).
3. Provision infra: Resource Group, Log Analytics, ACR, PostgreSQL Flexible,
   Redis, Key Vault, Managed Identities, Container Apps environment.
4. Build and push images to ACR (CI job).
5. Deploy Container Apps pointing to images and Key Vault secrets.
6. Run DB migrations and seed data (CI job or Terraform null_resource).
7. Configure DNS/TLS, monitoring, backups and alerts.

Repository layout (recommended)

terraform/
- modules/
  - acr/
  - postgres/
  - redis/
  - keyvault/
  - container-app/
- envs/
  - prod/
    - main.tf
    - variables.tf
    - backend.tf
    - provider.tf
    - outputs.tf

Provider and remote state (example)

1) `provider.tf` (env-specific)

```hcl
terraform {
  required_providers {
    azurerm = { source = "hashicorp/azurerm" version = ">= 3.0" }
  }
  required_version = ">= 1.5"
}

provider "azurerm" {
  features {}
}
```

2) `backend.tf` (Terraform remote state using Azure Storage)

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = var.state_rg_name
    storage_account_name = var.state_storage_account_name
    container_name       = var.state_container_name
    key                  = "terraform.tfstate"
  }
}
```

Note: the storage account/container must exist before using AzureRM backend.
You can bootstrap it with `az` or with a small one-off Terraform run using a
local backend and then migrate the state.

Minimal bootstrap commands (one-off)

```bash
# create resource group and storage account
az group create -n phone-list-rg -l eastus
az storage account create -n phoneliststate$RANDOM -g phone-list-rg -l eastus --kind StorageV2 --sku Standard_LRS
STORAGE_NAME=$(az.storage account list -g phone-list-rg --query "[0].name" -o tsv)
az storage container create --account-name $STORAGE_NAME -n tfstate

# now configure backend variables accordingly
```

Core resources (high level)
- `azurerm_resource_group` for all infra.
- `azurerm_log_analytics_workspace` and `azurerm_container_app_environment`.
- `azurerm_container_registry` for images.
- `azurerm_postgresql_flexible_server` (or `azurerm_postgresql_server`) with
  private access if needed.
- `azurerm_redis_cache` for Redis.
- `azurerm_key_vault` + `azurerm_key_vault_secret` for sensitive values.
- `azurerm_user_assigned_identity` for Container Apps to pull images and
  access Key Vault.
- `azurerm_container_app` resources for backend/frontend.

Key design notes
- Use Managed Identity for Container Apps and grant it `AcrPull` role on ACR
  and `get`/`list` permissions on Key Vault (via access policies or role
  assignment + Key Vault RBAC).
- Use private endpoints for PostgreSQL and Redis for production security where
  possible; otherwise firewall rules limited to Container Apps or VNet.
- Keep secrets out of Terraform state when possible: store sensitive runtime
  secrets in Key Vault and reference via Key Vault provider or environment
  variable injection in Container Apps.

Example Terraform snippet: create ACR and give identity pull rights

```hcl
resource "azurerm_container_registry" "acr" {
  name                = var.acr_name
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Standard"
  admin_enabled       = false
}

resource "azurerm_role_assignment" "acr_pull" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.app_identity.principal_id
}
```

Container App (image + env) sketch

```hcl
resource "azurerm_container_app" "backend" {
  name                = "phone-list-api"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  container_app_environment_id = azurerm_container_app_environment.env.id

  identity {
    type = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app_identity.id]
  }

  template {
    container {
      name   = "api"
      image  = "${azurerm_container_registry.acr.login_server}/${var.acr_api_repo}:${var.image_tag}"
      cpu    = 0.5
      memory = "1.0Gi"
      env {
        name  = "DATABASE_URL"
        value = var.database_url
      }
    }
    scale {
      min_replicas = 1
      max_replicas = 3
    }
  }
}
```

CI / GitHub Actions (recommended) — outline

- Build backend image, tag as `ghcr.io/...` or ACR `login_server/backend:sha`.
- Build frontend image, tag similarly.
- Authenticate to ACR using Azure OIDC (recommended) or service principal.
- Push images to ACR.
- Run `terraform fmt && terraform init && terraform plan` and then
  `terraform apply -auto-approve` in a controlled environment (protect prod).
- After apply, run a `migrations` job that runs `docker run` (or `az container start`)
  using the pushed backend image to execute `npm run migrate` against the
  provisioned Postgres endpoint.

Minimal GitHub Actions job (sketch)

```yaml
name: CI/CD
on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }} # or use OIDC with tenant/subscription
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Set up Terraform
        uses: hashicorp/setup-terraform@v2

      - name: Build and push backend image
        uses: azure/docker-login@v1
        with:
          login-server: ${{ env.ACR_LOGIN_SERVER }}
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}

      - name: Build backend
        run: |
          docker build -t ${{ env.ACR_LOGIN_SERVER }}/phone-list-api:${{ github.sha }} ./backend
          docker push ${{ env.ACR_LOGIN_SERVER }}/phone-list-api:${{ github.sha }}

      - name: Terraform Init/Apply
        env:
          ARM_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          ARM_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          ARM_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
        run: |
          cd terraform/envs/prod
          terraform init
          terraform apply -auto-approve

      - name: Run migrations
        run: |
          docker run --rm \ 
            -e DATABASE_URL="${{ secrets.PROD_DATABASE_URL }}" \ 
            ${{ env.ACR_LOGIN_SERVER }}/phone-list-api:${{ github.sha }} npm run migrate
```

Notes and security
- Prefer GitHub OIDC or a short-lived service principal instead of long-lived
  secrets. Use `azure/login` with `client-id`/`tenant-id`/`subscription-id` or
  OIDC configuration.
- Store secret values (JWT secret, DB password) in Key Vault and reference
  them from Container Apps with identity-based access.
- Do not embed production DB credentials directly in Terraform files. Use
  `azurerm_key_vault_secret` and set `sensitive = true` on Terraform outputs if
  you must surface values.

Running strategy & migration
- Run migrations as a separate CI job after infrastructure apply and images
  are pushed. This avoids coupling Terraform with ephemeral runtime tasks.
- Alternatively, use a `null_resource` with `local-exec` or `remote-exec` to
  trigger a one-off container to run migrations, but be cautious —
  Terraform may re-run if the condition changes.

DNS and TLS
- For production TLS and traffic management use Azure Front Door or App
  Service custom domain with managed certificate. Point frontend hostname to
  Container App ingress or to Front Door which routes to Container App.

Monitoring and backups
- Enable Log Analytics and configure Container Apps to send logs.
- Configure automated backups/retention on PostgreSQL Flexible Server.

Rollback plan
- Keep older image tags in ACR.
- Use `terraform apply` to change Container App image tag back to previous
  working tag and verify health endpoints.

Next actions I can take for you
1. Scaffold `terraform/` layout and initial `provider.tf` + `backend.tf` with
   example variables committed to the repo.
2. Create a GitHub Actions workflow in `.github/workflows/` that builds images
   and runs Terraform.

Tell me which next action you want me to perform and I will scaffold the
files accordingly.
