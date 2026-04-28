variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "name" {
  type = string
}

variable "capacity" {
  type    = number
  default = 0
}

variable "family" {
  type    = string
  default = "C"
}

variable "sku_name" {
  type    = string
  default = "Basic"
}

variable "enable_non_ssl_port" {
  type    = bool
  default = false
}
