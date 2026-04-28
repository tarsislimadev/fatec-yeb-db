# Azure Terraform Deployment Quickstart

This guide walks you through deploying `fatec-yeb-db` to Azure using Terraform.

## Prerequisites

- Azure CLI installed and authenticated: `az login`
- Terraform >= 1.5 installed
- Git repository set up with GitHub Actions enabled

## Step 1: Bootstrap Terraform State

The Terraform state must be stored in Azure Storage. Create the remote state storage once:

```bash
# Set variables
export TFSTATE_RG="phone-list-tfstate-rg"
export TFSTATE_LOCATION="eastus"
export TFSTATE_STORAGE_ACCOUNT="phoneliststate$(date +%s)"
export TFSTATE_CONTAINER="tfstate"

# Create resource group
az group create -n "$TFSTATE_RG" -l "$TFSTATE_LOCATION"

# Create storage account (must be globally unique)
az storage account create \
  -n "$TFSTATE_STORAGE_ACCOUNT" \
  -g "$TFSTATE_RG" \
  -l "$TFSTATE_LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2

# Create container
az storage container create \
  -n "$TFSTATE_CONTAINER" \
  --account-name "$TFSTATE_STORAGE_ACCOUNT"

# Save these for later use
echo "Storage Account: $TFSTATE_STORAGE_ACCOUNT"
echo "RG: $TFSTATE_RG"
echo "Container: $TFSTATE_CONTAINER"
```

## Step 2: Create GitHub Secrets

Add these secrets to your GitHub repository settings under **Settings > Secrets and variables > Actions**:

| Secret | Value |
|--------|-------|
| `AZURE_CLIENT_ID` | Service principal client ID or app registration ID |
| `AZURE_TENANT_ID` | Azure tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `AZURE_CLIENT_SECRET` | Service principal secret (or use OIDC) |
| `ACR_NAME` | Container registry name (e.g., `phonelistacr`) |
| `ACR_LOGIN_SERVER` | ACR login server (e.g., `phonelistacr.azurecr.io`) |
| `ACR_USERNAME` | ACR username for docker login |
| `ACR_PASSWORD` | ACR password for docker login |
| `TF_STATE_RG` | Terraform state resource group name |
| `TF_STATE_STORAGE_ACCOUNT` | Terraform state storage account name |
| `TF_STATE_CONTAINER` | Terraform state container name |
| `POSTGRES_ADMIN_PASSWORD` | PostgreSQL admin password (min 32 chars, complex) |
| `POSTGRES_DB_PASSWORD` | PostgreSQL app user password (min 32 chars, complex) |
| `JWT_SECRET` | JWT signing secret (min 32 characters) |
| `PROD_DATABASE_URL` | Database connection string (format: `postgresql://...`) |

## Step 3: Configure Terraform Variables

Copy the example variables file and customize for your environment:

```bash
cd terraform/envs/prod
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl

# Edit terraform.tfvars and backend.hcl with your values
# Key values to customize:
# - postgres_server_name (unique across Azure)
# - key_vault_name (unique across Azure)
# - postgres_admin_password
# - postgres_db_password
# - jwt_secret
```

## Step 4: Create Service Principal (if not using OIDC)

```bash
# Create service principal with Contributor role on subscription
az ad sp create-for-rbac \
  --name "fatec-yeb-db-deployer" \
  --role Contributor \
  --scopes /subscriptions/<YOUR_SUBSCRIPTION_ID>

# Note the output:
# - appId -> AZURE_CLIENT_ID
# - password -> AZURE_CLIENT_SECRET
# - tenant -> AZURE_TENANT_ID
```

## Step 5: Push Terraform Code and Trigger Deployment

```bash
# Ensure all changes are committed
git add terraform/ .github/workflows/
git commit -m "Add Terraform and GitHub Actions workflow"
git push origin main

# GitHub Actions will automatically:
# 1. Build backend and frontend Docker images
# 2. Push to Azure Container Registry
# 3. Run Terraform to provision/update Azure resources
# 4. Run database migrations
```

## Step 6: Verify Deployment

Once the GitHub Actions workflow completes:

```bash
# View deployed apps
az container app list -g phone-list-rg

# View logs
az container app logs -n phone-list-api -g phone-list-rg
az container app logs -n phone-list-web -g phone-list-rg

# Test backend health
curl https://<backend-fqdn>/health

# View terraform outputs
cd terraform/envs/prod
terraform output
```

## Local Development & Testing

To test Terraform locally before pushing:

```bash
cd terraform/envs/prod

# Format code
terraform fmt -recursive

# Initialize (one-time per env)
terraform init -backend-config=backend.hcl

# Plan changes
terraform plan -var-file=terraform.tfvars

# Apply changes (use with caution in prod)
terraform apply -var-file=terraform.tfvars
```

## Troubleshooting

### Remote State Backend Error
If you get a backend error during `terraform init`, ensure:
- The storage account exists and is accessible
- You have RBAC permissions on the storage account
- Storage account keys/connection string are correct

### Secrets Not Found
Ensure all required GitHub secrets are set. Check workflow run logs for missing variables.

### Image Pull Failures
Verify:
- Images are successfully pushed to ACR
- Managed Identity has AcrPull role on the registry
- Container App pulls images with the correct tag

### Database Connection Failures
Check:
- PostgreSQL firewall rules allow Container App subnet
- DATABASE_URL in Key Vault matches the actual server FQDN
- Database user has required permissions

## Cleanup

```bash
# Destroy all Azure resources (Terraform-managed)
terraform destroy -var-file=terraform.tfvars

# Delete state storage (only if fully removing Terraform)
az storage account delete -n "$TFSTATE_STORAGE_ACCOUNT" -g "$TFSTATE_RG"
```

## Next Steps

- Configure DNS/custom domain (see `../docs/azure.terraform.md`)
- Set up monitoring and alerts
- Configure backups for PostgreSQL
- Set up CI/CD for the frontend separately if desired
