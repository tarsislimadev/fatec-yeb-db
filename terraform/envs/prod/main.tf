locals {
  rg_name = var.rg_name
}

resource "azurerm_resource_group" "rg" {
  name     = local.rg_name
  location = var.location
}

# Log Analytics & Container App Environment
module "log_analytics" {
  source              = "../../modules/log-analytics"
  resource_group_name = azurerm_resource_group.rg.name
  location            = var.location
  workspace_name      = "${local.rg_name}-workspace"
}

module "container_app_env" {
  source                      = "../../modules/container-app-env"
  resource_group_name         = azurerm_resource_group.rg.name
  location                    = var.location
  environment_name            = var.container_app_env_name
  log_analytics_workspace_id  = module.log_analytics.workspace_id
  log_analytics_workspace_key = module.log_analytics.workspace_key
}

# Container Registry
module "acr" {
  source              = "../../modules/acr"
  resource_group_name = azurerm_resource_group.rg.name
  location            = var.location
  name                = var.acr_name
}

# Managed Identity for Container Apps to pull from ACR
resource "azurerm_user_assigned_identity" "app_identity" {
  name                = "${local.rg_name}-app-identity"
  resource_group_name = azurerm_resource_group.rg.name
  location            = var.location
}

resource "azurerm_role_assignment" "acr_pull" {
  scope                = module.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.app_identity.principal_id
}

# PostgreSQL
module "postgres" {
  source                 = "../../modules/postgres"
  resource_group_name    = azurerm_resource_group.rg.name
  location               = var.location
  server_name            = var.postgres_server_name
  administrator_login    = "phone_admin"
  administrator_password = var.postgres_admin_password
  database_user          = "phone_user"
  database_password      = var.postgres_db_password
}

# Redis
module "redis" {
  source              = "../../modules/redis"
  resource_group_name = azurerm_resource_group.rg.name
  location            = var.location
  name                = var.redis_name
  capacity            = 0
  family              = "C"
  sku_name            = "Basic"
}

# Key Vault
resource "azurerm_key_vault" "this" {
  name                = var.key_vault_name
  location            = var.location
  resource_group_name = azurerm_resource_group.rg.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = var.key_vault_sku

  enabled_for_deployment          = true
  enabled_for_disk_encryption     = true
  enabled_for_template_deployment = true
  purge_protection_enabled        = false
  soft_delete_retention_days      = 7
}

module "keyvault" {
  source              = "../../modules/keyvault"
  resource_group_name = azurerm_resource_group.rg.name
  location            = var.location
  name                = var.key_vault_name
  key_vault_id        = azurerm_key_vault.this.id
  principal_id        = azurerm_user_assigned_identity.app_identity.principal_id
  secrets = {
    database-url = module.postgres.database_url
    redis-url    = module.redis.redis_url
    jwt-secret   = var.jwt_secret
  }
}

# Backend Container App
module "backend" {
  source                       = "../../modules/container-app"
  resource_group_name          = azurerm_resource_group.rg.name
  location                     = var.location
  container_app_environment_id = module.container_app_env.id
  name                         = var.backend_app_name
  image                        = "${module.acr.login_server}/${var.acr_api_repo}:${var.image_tag}"
  cpu                          = var.backend_cpu
  memory                       = var.backend_memory
  acr_identity_id              = azurerm_user_assigned_identity.app_identity.id
  env_vars = {
    NODE_ENV     = "production"
    PORT         = "3000"
    FRONTEND_URL = "https://${module.frontend.fqdn}"
  }
  depends_on = [azurerm_role_assignment.acr_pull, module.keyvault]
}

# Frontend Container App
module "frontend" {
  source                       = "../../modules/container-app"
  resource_group_name          = azurerm_resource_group.rg.name
  location                     = var.location
  container_app_environment_id = module.container_app_env.id
  name                         = var.frontend_app_name
  image                        = "${module.acr.login_server}/${var.acr_web_repo}:${var.image_tag}"
  cpu                          = var.frontend_cpu
  memory                       = var.frontend_memory
  acr_identity_id              = azurerm_user_assigned_identity.app_identity.id
  ingress_target_port          = 80
  env_vars = {
    NODE_ENV = "production"
  }
  depends_on = [azurerm_role_assignment.acr_pull, module.backend]
}

# Data source for current Azure context
data "azurerm_client_config" "current" {}

# Outputs
output "acr_login_server" {
  value = module.acr.login_server
}

output "backend_fqdn" {
  value = module.backend.fqdn
}

output "frontend_fqdn" {
  value = module.frontend.fqdn
}

output "postgres_fqdn" {
  value = module.postgres.server_fqdn
}

output "redis_hostname" {
  value = module.redis.hostname
}

output "key_vault_id" {
  value = azurerm_key_vault.this.id
}
