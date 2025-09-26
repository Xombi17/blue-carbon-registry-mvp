import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatNumber(num: number) {
  return new Intl.NumberFormat("en-US").format(num)
}

export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount)
}

export function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function getEcosystemColor(type: string) {
  switch (type.toUpperCase()) {
    case "MANGROVE":
      return "bg-green-500"
    case "SEAGRASS":
      return "bg-blue-500"
    case "SALT_MARSH":
      return "bg-purple-500"
    default:
      return "bg-gray-500"
  }
}

export function getStatusColor(status: string) {
  switch (status.toUpperCase()) {
    case "PENDING":
      return "bg-yellow-500"
    case "VERIFIED":
      return "bg-green-500"
    case "REJECTED":
      return "bg-red-500"
    case "CREDITS_ISSUED":
      return "bg-blue-500"
    default:
      return "bg-gray-500"
  }
}

export function generateProjectId() {
  return `BCP-${Date.now().toString(36).toUpperCase()}`
}

export function isValidCoordinates(lat: number, lng: number) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371 // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Distance in kilometers
}