variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "server_name" {
  type = string
}

variable "administrator_login" {
  type      = string
  default   = "phone_admin"
  sensitive = true
}

variable "administrator_password" {
  type      = string
  sensitive = true
}

variable "sku_name" {
  type    = string
  default = "B_Standard_B1ms"
}

variable "storage_mb" {
  type    = number
  default = 32768
}

variable "backup_retention_days" {
  type    = number
  default = 7
}

variable "database_name" {
  type    = string
  default = "phone_list"
}

variable "database_user" {
  type      = string
  default   = "phone_user"
  sensitive = true
}

variable "database_password" {
  type      = string
  sensitive = true
}
