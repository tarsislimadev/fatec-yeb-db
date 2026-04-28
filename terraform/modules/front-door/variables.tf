variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "name" {
  type = string
}

variable "backend_fqdn" {
  type = string
}

variable "frontend_fqdn" {
  type = string
}

variable "custom_domain" {
  type    = string
  default = ""
}

variable "enable_waf" {
  type    = bool
  default = false
}
