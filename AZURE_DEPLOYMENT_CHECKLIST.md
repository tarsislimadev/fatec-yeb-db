# Azure Terraform Deployment — Implementation Checklist

Use this checklist to track progress through the Azure Terraform deployment.

## Pre-Deployment Phase

### Prerequisites
- [ ] Azure subscription created and active
- [ ] Azure CLI installed (`az --version`)
- [ ] Terraform installed (`terraform --version >= 1.5`)
- [ ] GitHub repo with Actions enabled
- [ ] Contributor role on Azure subscription
- [ ] Docker installed locally (for testing)

### Repository Setup
- [ ] All code committed (`backend/`, `frontend/`, configuration)
- [ ] `.github/workflows/azure-deploy.yml` in repo
- [ ] `terraform/` directory with all modules
- [ ] `docs/azure.terraform.md` reviewed
- [ ] `terraform/README.md` reviewed
- [ ] `terraform/QUICKSTART.md` reviewed

### Infrastructure Preparation
- [ ] Azure Tenant ID noted (for service principal)
- [ ] Azure Subscription ID noted
- [ ] Unique names chosen for:
  - [ ] Resource Group (e.g., `phone-list-rg`)
  - [ ] Container Registry (e.g., `phonelistacr` — must be globally unique)
  - [ ] PostgreSQL server (e.g., `phone-list-db` — must be globally unique)
  - [ ] Key Vault (e.g., `phone-list-kv` — must be globally unique)
  - [ ] Redis cache (e.g., `phonelist-redis`)

## State Backend Setup (One-Time)

### Create Terraform State Storage
- [ ] Create resource group for state: `az group create -n phone-list-tfstate-rg -l eastus`
- [ ] Create storage account: `az storage account create -n phoneliststate<random> ...`
- [ ] Create container: `az storage container create -n tfstate ...`
- [ ] Note storage account name and container name
- [ ] Verify access: `az storage account keys list -n <storage-name>`

### State Backend Configuration
- [ ] Update `terraform/envs/prod/backend.tf` with:
  - [ ] `resource_group_name` = tfstate RG name
  - [ ] `storage_account_name` = tfstate storage account name
  - [ ] `container_name` = tfstate container name
- [ ] Test: `cd terraform/envs/prod && terraform init`

## Azure Authentication Setup

### Service Principal Creation (for CI/CD)
- [ ] Create service principal:
  ```bash
  az ad sp create-for-rbac --name phone-list-deployer --role Contributor
  ```
- [ ] Note output:
  - [ ] `appId` → AZURE_CLIENT_ID
  - [ ] `password` → AZURE_CLIENT_SECRET (save securely!)
  - [ ] `tenant` → AZURE_TENANT_ID

### GitHub Secrets Configuration
Add these to GitHub repo **Settings > Secrets and variables > Actions**:

**Azure Authentication:**
- [ ] `AZURE_CLIENT_ID` = service principal appId
- [ ] `AZURE_CLIENT_SECRET` = service principal password (or use OIDC)
- [ ] `AZURE_TENANT_ID` = Azure tenant ID
- [ ] `AZURE_SUBSCRIPTION_ID` = subscription ID

**Terraform State:**
- [ ] `TF_STATE_RG` = `phone-list-tfstate-rg`
- [ ] `TF_STATE_STORAGE_ACCOUNT` = tfstate storage account name
- [ ] `TF_STATE_CONTAINER` = `tfstate`

**Container Registry:**
- [ ] `ACR_NAME` = container registry name (e.g., `phonelistacr`)
- [ ] `ACR_LOGIN_SERVER` = `<acr-name>.azurecr.io`
- [ ] `ACR_USERNAME` = (set after ACR created, or use service principal client ID)
- [ ] `ACR_PASSWORD` = (set after ACR created, or use service principal secret)

**Application Secrets:**
- [ ] `POSTGRES_ADMIN_PASSWORD` = secure password (min 32 chars, complexity)
- [ ] `POSTGRES_DB_PASSWORD` = secure password (min 32 chars, complexity)
- [ ] `JWT_SECRET` = random secret (min 32 characters)
- [ ] `PROD_DATABASE_URL` = placeholder (will be auto-generated)

## Infrastructure Configuration

### Terraform Variables
- [ ] Copy template: `cp terraform/envs/prod/terraform.tfvars.example terraform/envs/prod/terraform.tfvars`
- [ ] Edit `terraform/envs/prod/terraform.tfvars`:
  - [ ] `state_rg_name` = `phone-list-tfstate-rg`
  - [ ] `state_storage_account_name` = tfstate storage account name
  - [ ] `state_container_name` = `tfstate`
  - [ ] `location` = preferred Azure region (e.g., `eastus`)
  - [ ] `rg_name` = resource group for app infrastructure
  - [ ] `acr_name` = container registry name (globally unique)
  - [ ] `postgres_server_name` = postgres server name (globally unique)
  - [ ] `postgres_admin_password` = secure admin password
  - [ ] `postgres_db_password` = secure app user password
  - [ ] `redis_name` = redis cache name
  - [ ] `key_vault_name` = key vault name (globally unique)
  - [ ] `jwt_secret` = JWT signing secret
  - [ ] `container_app_env_name` = container app environment name
  - [ ] `backend_app_name` = backend container app name
  - [ ] `frontend_app_name` = frontend container app name
  - [ ] `acr_api_repo` = `phone-list-api`
  - [ ] `acr_web_repo` = `phone-list-web`
  - [ ] `backend_cpu` = `0.5` (adjust for workload)
  - [ ] `backend_memory` = `1.0Gi` (adjust for workload)
  - [ ] `frontend_cpu` = `0.25`
  - [ ] `frontend_memory` = `0.5Gi`

### Docker Image Verification
- [ ] Test backend build locally:
  ```bash
  docker build -t phone-list-api:test ./backend
  docker run --rm phone-list-api:test npm run test
  ```
- [ ] Test frontend build locally:
  ```bash
  docker build -t phone-list-web:test ./frontend
  docker run --rm phone-list-web:test npm run build
  ```

## Pre-Deployment Testing

### Local Terraform Validation
- [ ] Format code: `cd terraform && terraform fmt -recursive`
- [ ] Validate syntax: `cd terraform/envs/prod && terraform validate`
- [ ] Generate plan: `terraform plan -var-file=terraform.tfvars -out=tfplan`
- [ ] Review plan output for correctness
- [ ] No hardcoded secrets in `.tf` files (use variables)

### Repository Hygiene
- [ ] No sensitive files accidentally committed
- [ ] `.gitignore` includes `*.tfstate`, `.terraform/`, `terraform.tfvars`
- [ ] All changes committed and pushed to feature branch
- [ ] Ready for PR review (optional)

## Deployment Phase

### Initial Deployment
- [ ] Ensure main branch is fully tested
- [ ] Git commit all changes:
  ```bash
  git add terraform/ .github/workflows/ docs/
  git commit -m "feat: Add Azure Terraform deployment"
  git push origin main
  ```
- [ ] Monitor GitHub Actions workflow:
  - [ ] Checkout code ✓
  - [ ] Login to Azure ✓
  - [ ] Build backend image ✓
  - [ ] Build frontend image ✓
  - [ ] Push to ACR ✓
  - [ ] Terraform Init ✓
  - [ ] Terraform Apply ✓
  - [ ] Run migrations ✓
  - [ ] Health checks pass ✓

### Workflow Completion
- [ ] Workflow run completes (green checkmark)
- [ ] No errors in workflow logs
- [ ] Deployment summary shows:
  - [ ] Backend FQDN
  - [ ] Frontend FQDN
  - [ ] ACR login server

## Post-Deployment Validation

### Azure Resource Verification
- [ ] Resource group created: `az group list -g phone-list-rg`
- [ ] Container apps exist:
  ```bash
  az container app list -g phone-list-rg \
    --query "[].{Name:name, State:properties.provisioningState}"
  ```
- [ ] PostgreSQL server exists: `az postgres flexible-server list -g phone-list-rg`
- [ ] Redis cache exists: `az redis list -g phone-list-rg`
- [ ] Key Vault exists: `az keyvault list -g phone-list-rg`
- [ ] ACR exists: `az acr list -g phone-list-rg`

### Container Health Checks
- [ ] Backend container running:
  ```bash
  BACKEND_URL=$(terraform output -raw backend_fqdn)
  curl -I "https://$BACKEND_URL/health"
  # Expected: HTTP 200
  ```
- [ ] Frontend container running:
  ```bash
  FRONTEND_URL=$(terraform output -raw frontend_fqdn)
  curl -I "https://$FRONTEND_URL"
  # Expected: HTTP 200
  ```

### Database Verification
- [ ] PostgreSQL server accessible
- [ ] Database `phone_list` exists
- [ ] Tables created (migrations ran):
  ```bash
  psql -h <postgres-fqdn> -U phone_user@<server> -d phone_list -c "\dt"
  ```
- [ ] Admin and app users created

### Application API Tests
- [ ] Register new account:
  ```bash
  curl -X POST "https://$BACKEND_URL/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "TestPassword123!"}'
  ```
- [ ] Login:
  ```bash
  curl -X POST "https://$BACKEND_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "TestPassword123!"}'
  # Save token from response
  ```
- [ ] List phones (with token):
  ```bash
  curl -X GET "https://$BACKEND_URL/api/v1/phones" \
    -H "Authorization: Bearer <TOKEN>"
  # Expected: HTTP 200 with array
  ```

### Frontend Testing (Manual)
- [ ] Open `https://<frontend-fqdn>` in browser
- [ ] Page loads within 2 seconds
- [ ] No console errors (F12 → Console)
- [ ] All styles render correctly
- [ ] Create Test Account workflow:
  - [ ] Click "Sign Up"
  - [ ] Fill email and password (8+ chars, 1 number, 1 upper)
  - [ ] Click "Create Account"
  - [ ] Redirected to login/dashboard
- [ ] Login workflow:
  - [ ] Enter credentials
  - [ ] Click "Login"
  - [ ] Redirected to dashboard
  - [ ] User menu shows email
- [ ] Create Person workflow:
  - [ ] Click "Add Person"
  - [ ] Fill name and email
  - [ ] Click "Create"
  - [ ] Person appears in list
- [ ] Add Phone workflow:
  - [ ] Click on person
  - [ ] Click "Add Phone"
  - [ ] Enter phone number (e.g., +55 11 99999-9999)
  - [ ] Click "Add"
  - [ ] Phone appears in phone list

### Monitoring & Logging
- [ ] View backend logs:
  ```bash
  az container app logs -n phone-list-api -g phone-list-rg --follow
  ```
- [ ] View frontend logs:
  ```bash
  az container app logs -n phone-list-web -g phone-list-rg --follow
  ```
- [ ] Check Log Analytics workspace:
  ```bash
  az monitor log-analytics query -w <workspace-id> \
    -q "ContainerAppConsoleLogs_CL | take 50"
  ```

## Production Hardening

### Security Configuration
- [ ] Enable Azure Defender on subscription
- [ ] Configure Key Vault soft delete:
  ```bash
  az keyvault update -n phone-list-kv --enable-soft-delete true
  ```
- [ ] Review PostgreSQL firewall rules (restrict if needed)
- [ ] Review CORS settings in backend (match frontend domain)
- [ ] Review Container App ingress settings

### High Availability
- [ ] Set backend min replicas to 2:
  ```hcl
  backend_min_replicas = 2
  # Then: terraform apply
  ```
- [ ] Configure Container App health probes (already done in module)
- [ ] Enable PostgreSQL backup retention (default 7 days)
- [ ] Test failover by manually stopping one replica

### Monitoring & Alerts
- [ ] Set up Azure Monitor alerts:
  - [ ] High CPU usage (>80%)
  - [ ] High memory usage (>80%)
  - [ ] Database connection failures
  - [ ] Redis cache hits/misses
- [ ] Configure log alerts in Log Analytics
- [ ] Set up budget alerts for cost anomalies

### Domain Configuration (Optional)
- [ ] Obtain custom domain (e.g., phone-list.example.com)
- [ ] Create DNS records pointing to Front Door endpoint (if using)
- [ ] Update FRONTEND_URL environment variable
- [ ] Update CORS settings in backend

## Ongoing Operations

### Regular Maintenance
- [ ] Weekly: Review container logs for errors
- [ ] Weekly: Check resource utilization and costs
- [ ] Monthly: Review and rotate secrets in Key Vault
- [ ] Monthly: Verify database backups are working
- [ ] Quarterly: Update Docker base images and Dependencies

### Troubleshooting Runbook
- [ ] Container won't start → Check logs, verify image pushed to ACR
- [ ] Database connection fails → Check firewall rules, verify credentials in Key Vault
- [ ] High latency → Check container CPU/memory allocation, database query performance
- [ ] Secrets not injecting → Verify Managed Identity Key Vault permissions
- [ ] Health checks failing → Verify /health endpoint, check application logs

### Rollback Procedure
- [ ] To rollback to previous image:
  ```bash
  cd terraform/envs/prod
  terraform apply -var="image_tag=<previous-commit-sha>"
  ```
- [ ] To rollback database schema:
  - Connect to PostgreSQL
  - Manually revert schema changes (depends on migration tool)
  - Restart containers after rollback

### Emergency Procedures
- [ ] Complete infrastructure rebuild:
  ```bash
  terraform destroy -var-file=terraform.tfvars
  terraform apply -var-file=terraform.tfvars
  ```
- [ ] Database emergency restore (requires backup):
  ```bash
  # Follow Azure PostgreSQL restore documentation
  ```

## Sign-Off

- [ ] Infrastructure fully deployed ✓
- [ ] All containers running ✓
- [ ] Databases accessible ✓
- [ ] APIs responding ✓
- [ ] Frontend accessible ✓
- [ ] Full end-to-end workflow tested ✓
- [ ] Logs flowing to Log Analytics ✓
- [ ] Monitoring & alerts configured ✓
- [ ] Team trained on operations ✓
- [ ] Documentation reviewed by team ✓

**Deployment Date:** _______________
**Deployed By:** _______________
**Approved By:** _______________

---

**Deployment Complete!** 🎉

For ongoing support, refer to:
- Troubleshooting: `docs/azure-testing-validation.md`
- Architecture questions: `docs/azure.terraform.md`
- Deployment procedures: `terraform/QUICKSTART.md`
