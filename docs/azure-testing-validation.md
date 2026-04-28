# Azure Terraform Deployment — Testing & Validation Guide

## Pre-Deployment Validation

### Terraform Syntax & Validation

Before applying Terraform changes, validate the configuration:

```bash
cd terraform/envs/prod

# Format all Terraform files
terraform fmt -recursive ../..

# Validate syntax
terraform validate

# Generate and review execution plan
terraform plan -var-file=terraform.tfvars -out=tfplan
terraform show tfplan
```

### Repository Checklist

- [ ] All Terraform files are formatted and validated
- [ ] No hardcoded secrets in `.tf` files (use variables)
- [ ] `.gitignore` includes `*.tfstate`, `terraform.tfvars`, `.terraform/`
- [ ] GitHub secrets are configured (see QUICKSTART.md)
- [ ] Service principal has Contributor role on subscription
- [ ] Terraform state storage account exists
- [ ] Docker images build locally without errors

## Deployment Workflow

### 1. Initial Deployment (First Time)

```bash
# Create backend Docker images locally to test
docker build -t phone-list-api:test ./backend
docker build -t phone-list-web:test ./frontend

# Run basic container tests
docker run --rm -it phone-list-api:test npm run test
docker run --rm -it phone-list-web:test npm run test:e2e

# Create service principal if not already done
az ad sp create-for-rbac --name phone-list-deployer --role Contributor

# Initialize Terraform
cd terraform/envs/prod
terraform init

# Review and apply
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars

# Save outputs
terraform output > deployment-info.txt
```

### 2. GitHub Actions Deployment

Push code to trigger GitHub Actions:

```bash
git add -A
git commit -m "Deploy to Azure via Terraform"
git push origin main

# Monitor workflow
# Go to GitHub repo > Actions > Watch the workflow run
```

**Workflow stages:**
1. Build images (5-10 mins)
2. Push to ACR (2-3 mins)
3. Terraform plan & apply (5-10 mins)
4. Run migrations (2-3 mins)
5. Health checks (2-3 mins)

## Post-Deployment Validation

### 1. Azure Resources Created

Verify all resources exist:

```bash
# List resource groups
az group list --query "[].{Name:name, Location:location}" -o table

# List container apps
az container app list -g phone-list-rg \
  --query "[].{Name:name, ProvisioningState:properties.provisioningState}" -o table

# List databases
az postgres flexible-server list -g phone-list-rg \
  --query "[].{Name:name, State:state}" -o table

# List Redis instances
az redis list -g phone-list-rg \
  --query "[].{Name:name, ProvisioningState:provisioningState}" -o table

# List Key Vaults
az keyvault list -g phone-list-rg --query "[].{Name:name}" -o table
```

### 2. Container Health Checks

```bash
# Backend health endpoint
BACKEND_URL=$(az container app show -n phone-list-api -g phone-list-rg \
  --query "properties.configuration.ingress.fqdn" -o tsv)
curl -I "https://$BACKEND_URL/health"
# Expected: HTTP 200

# Frontend health check
FRONTEND_URL=$(az container app show -n phone-list-web -g phone-list-rg \
  --query "properties.configuration.ingress.fqdn" -o tsv)
curl -I "https://$FRONTEND_URL"
# Expected: HTTP 200
```

### 3. Database Connectivity

```bash
# Get PostgreSQL server details
POSTGRES_HOST=$(terraform output -raw postgres_fqdn)
POSTGRES_USER="phone_user"

# Test connection (requires psql installed)
psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER@$(echo $POSTGRES_HOST | cut -d. -f1)" \
  -d phone_list -c "SELECT version();"

# Check if migrations ran
psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER@$(echo $POSTGRES_HOST | cut -d. -f1)" \
  -d phone_list -c "\dt"
# Should show tables: users, people, phones
```

### 4. API Functional Tests

```bash
# Get backend URL
BACKEND_URL="$(terraform output -raw backend_fqdn)"

# Test creating an account
curl -X POST "https://$BACKEND_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'

# Test login
curl -X POST "https://$BACKEND_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
# Save the returned token

# Test protected endpoint (with token from login response)
curl -X GET "https://$BACKEND_URL/api/v1/phones" \
  -H "Authorization: Bearer <TOKEN_FROM_LOGIN>"
```

### 5. Frontend Verification

```bash
# Get frontend URL
FRONTEND_URL="$(terraform output -raw frontend_fqdn)"

# Verify home page loads
curl -L "https://$FRONTEND_URL" | head -20
# Should return HTML with React app structure
```

### 6. Logs and Monitoring

```bash
# View backend logs
az container app logs -n phone-list-api -g phone-list-rg --follow

# View frontend logs
az container app logs -n phone-list-web -g phone-list-rg --follow

# View Log Analytics
az monitor log-analytics query \
  -w $(az monitor log-analytics workspace list -g phone-list-rg --query "[0].id" -o tsv) \
  -q "ContainerAppConsoleLogs_CL | take 50" \
  --output table
```

## End-to-End Test (Manual)

### Step 1: Access Frontend

```
https://<frontend-fqdn>/
```

- [ ] Page loads within 2 seconds
- [ ] No console errors
- [ ] All styles render correctly

### Step 2: Create Account

1. Click "Sign Up"
2. Enter email: `test-$(date +%s)@example.com`
3. Enter password: `TestPassword123!`
4. Click "Sign Up"

Expected:
- [ ] Redirected to dashboard or login page
- [ ] No error messages
- [ ] Account created successfully

### Step 3: Login

1. Enter credentials
2. Click "Login"

Expected:
- [ ] Redirected to dashboard
- [ ] User menu shows email
- [ ] No authentication errors

### Step 4: Create Person

1. Click "Add Person"
2. Fill in fields:
   - Name: "Test User"
   - Email: `test-$(date +%s)@example.com`
3. Click "Create"

Expected:
- [ ] Person appears in people list
- [ ] Can view person details
- [ ] No validation errors

### Step 5: Add Phone

1. Click on person
2. Click "Add Phone"
3. Fill in fields:
   - Phone: "+55 11 99999-9999"
4. Click "Add"

Expected:
- [ ] Phone appears in phone list
- [ ] Phone is normalized/formatted
- [ ] No errors

### Step 6: Logout & Cleanup

1. Click user menu > "Logout"
2. Verify redirected to home page

Expected:
- [ ] Session cleared
- [ ] Redirected successfully

## Performance Validation

### Load Testing (Optional)

```bash
# Install Apache Bench or similar
apt-get install apache2-utils

# Test backend health endpoint
BACKEND_URL="https://$(terraform output -raw backend_fqdn)"
ab -n 100 -c 10 "$BACKEND_URL/health"

# Expected:
# - Response time < 500ms
# - Success rate > 99%
# - No 5xx errors
```

### Resource Utilization

```bash
# Check Container App CPU/memory
az monitor metrics list \
  -n phone-list-api \
  -g phone-list-rg \
  --resource-type "Microsoft.App/containerApps" \
  --metric "CpuUsagePercentage" \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S)Z
```

## Rollback Procedures

### Immediate Rollback (to previous Docker image)

If critical issues are found after deployment:

```bash
cd terraform/envs/prod

# Find previous image tag in ACR
az acr repository show-tags -n <acr-name> \
  --repository phone-list-api \
  --orderby time_desc \
  --output table
# Get the second-most-recent tag

# Rollback
terraform apply -var="image_tag=<previous-tag>"

# Verify
BACKEND_URL="$(terraform output -raw backend_fqdn)"
curl -I "https://$BACKEND_URL/health"
```

### Database Rollback

If database migrations fail:

```bash
# Connect to postgres
psql -h $(terraform output -raw postgres_fqdn) \
  -U phone_user@<server-name> \
  -d phone_list

# List migrations (assuming they're tracked in a migrations table)
SELECT * FROM schema_migrations ORDER BY version DESC;

# Manually rollback migrations as needed
-- (depends on your migration framework)
```

### Full Destroy (Nuclear Option)

```bash
cd terraform/envs/prod
terraform destroy -var-file=terraform.tfvars

# This will:
# - Delete all container apps
# - Delete database (after retention period)
# - Delete Redis
# - Delete Key Vault
# - Delete resource group (and all resources in it)

# WARNING: Data loss! Only use for testing/cleanup.
```

## Monitoring & Alerts (Optional Setup)

Azure Monitor integration is already configured via Log Analytics module.

For additional alerts, create them via Azure CLI:

```bash
# Alert on high backend CPU
az monitor metrics alert create \
  -n phone-list-api-high-cpu \
  -g phone-list-rg \
  --scopes /subscriptions/<sub>/resourceGroups/phone-list-rg/providers/Microsoft.App/containerApps/phone-list-api \
  --condition "avg CpuUsagePercentage > 80" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action /subscriptions/<sub>/resourceGroups/phone-list-rg/providers/Microsoft.Insights/actionGroups/<action-group-name>
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Container won't start | Image not found in ACR | Push image via GitHub Actions or manually: `docker push <acr>/phone-list-api:tag` |
| Database connection timeout | Firewall rules blocking | Add Container App subnet to PostgreSQL firewall or use private endpoint |
| Secrets not injecting | Key Vault access denied | Verify Managed Identity has Key Vault permission: `az keyvault set-policy` |
| Health checks failing | App not responding on /health | Check logs: `az container app logs -n phone-list-api` |
| High latency | Container too small | Increase CPU/memory: update `backend_cpu` and `backend_memory` variables |

## Success Criteria

- [ ] All containers are in "Running" state
- [ ] /health endpoint returns HTTP 200
- [ ] Database queryable with correct schema
- [ ] Frontend loads without errors
- [ ] User can register, login, create/read/update data
- [ ] Logs visible in Log Analytics
- [ ] No critical errors in container logs
- [ ] Response times < 1 second for standard operations

Once all criteria are met, deployment is successful!
