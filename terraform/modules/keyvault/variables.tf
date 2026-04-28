variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "name" {
  type = string
}

variable "key_vault_id" {
  type = string
}

variable "principal_id" {
  description = "Principal ID of the managed identity to grant access"
  type        = string
}

variable "secrets" {
  type      = map(string)
  sensitive = true
}
