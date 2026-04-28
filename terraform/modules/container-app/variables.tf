variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "container_app_environment_id" {
  type = string
}

variable "name" {
  type = string
}

variable "image" {
  type = string
}

variable "cpu" {
  type    = string
  default = "0.5"
}

variable "memory" {
  type    = string
  default = "1.0Gi"
}

variable "env_vars" {
  type    = map(string)
  default = {}
}

variable "ingress_enabled" {
  type    = bool
  default = true
}

variable "ingress_target_port" {
  type    = number
  default = 3000
}

variable "min_replicas" {
  type    = number
  default = 1
}

variable "max_replicas" {
  type    = number
  default = 3
}

variable "acr_identity_id" {
  description = "Managed identity ID for pulling images from ACR"
  type        = string
  default     = null
}
