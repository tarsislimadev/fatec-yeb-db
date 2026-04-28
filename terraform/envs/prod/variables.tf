variable "state_rg_name" {
  description = "Resource group containing the terraform state storage account"
  type        = string
}

variable "state_storage_account_name" {
  description = "Storage account name for terraform backend"
  type        = string
}

variable "state_container_name" {
  description = "Storage container name for terraform backend"
  type        = string
}

variable "location" {
  description = "Azure location"
  type        = string
  default     = "eastus"
}

variable "rg_name" {
  description = "Resource group name for resources"
  type        = string
  default     = "phone-list-rg"
}

variable "acr_name" {
  description = "ACR name (unique)"
  type        = string
  default     = "phonelistacr"
}

variable "image_tag" {
  description = "Image tag or digest to deploy"
  type        = string
  default     = "latest"
}

variable "postgres_server_name" {
  description = "PostgreSQL server name"
  type        = string
  default     = "phone-list-db"
}

variable "postgres_admin_password" {
  description = "PostgreSQL admin password"
  type        = string
  sensitive   = true
}

variable "postgres_db_password" {
  description = "PostgreSQL app user password"
  type        = string
  sensitive   = true
}

variable "redis_name" {
  description = "Redis cache name"
  type        = string
  default     = "phonelist-redis"
}

variable "key_vault_name" {
  description = "Key Vault name"
  type        = string
  default     = "phone-list-kv"
}

variable "jwt_secret" {
  description = "JWT secret"
  type        = string
  sensitive   = true
}

variable "key_vault_sku" {
  description = "Key Vault SKU"
  type        = string
  default     = "standard"
}

variable "container_app_env_name" {
  description = "Container App environment name"
  type        = string
  default     = "phone-list-env"
}

variable "backend_app_name" {
  description = "Backend container app name"
  type        = string
  default     = "phone-list-api"
}

variable "frontend_app_name" {
  description = "Frontend container app name"
  type        = string
  default     = "phone-list-web"
}

variable "acr_api_repo" {
  description = "ACR repository name for backend"
  type        = string
  default     = "phone-list-api"
}

variable "acr_web_repo" {
  description = "ACR repository name for frontend"
  type        = string
  default     = "phone-list-web"
}

variable "backend_cpu" {
  description = "Backend container CPU"
  type        = string
  default     = "0.5"
}

variable "backend_memory" {
  description = "Backend container memory"
  type        = string
  default     = "1.0Gi"
}

variable "frontend_cpu" {
  description = "Frontend container CPU"
  type        = string
  default     = "0.25"
}

variable "frontend_memory" {
  description = "Frontend container memory"
  type        = string
  default     = "0.5Gi"
}
