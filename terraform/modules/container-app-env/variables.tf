variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "environment_name" {
  type = string
}

variable "log_analytics_workspace_id" {
  type = string
}

variable "log_analytics_workspace_key" {
  type      = string
  sensitive = true
}
