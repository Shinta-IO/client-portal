// Accessible color system with black text for light mode
export const colors = {
  // Text colors - black and dark grays for light mode
  text: {
    primary: "text-black dark:text-white",           // Pure black for high contrast
    secondary: "text-gray-700 dark:text-gray-200",   // Dark gray for secondary content
    muted: "text-gray-600 dark:text-gray-400",       // Medium gray for muted content
    subtle: "text-gray-500 dark:text-gray-500",      // Subtle text for labels
    inverse: "text-white dark:text-black",           // For colored backgrounds only
  },
  
  // Background colors that work with black text
  bg: {
    primary: "bg-white dark:bg-gray-900",
    secondary: "bg-gray-50 dark:bg-gray-800", 
    elevated: "bg-white dark:bg-gray-800",
    muted: "bg-gray-100 dark:bg-gray-700",
  },
  
  // Semantic states with proper contrast
  status: {
    success: {
      bg: "bg-green-50 dark:bg-green-900/20",
      text: "text-green-800 dark:text-green-200",
      border: "border-green-200 dark:border-green-700",
    },
    warning: {
      bg: "bg-amber-50 dark:bg-amber-900/20",
      text: "text-amber-800 dark:text-amber-200", 
      border: "border-amber-200 dark:border-amber-700",
    },
    error: {
      bg: "bg-red-50 dark:bg-red-900/20",
      text: "text-red-800 dark:text-red-200",
      border: "border-red-200 dark:border-red-700", 
    },
    info: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      text: "text-blue-800 dark:text-blue-200",
      border: "border-blue-200 dark:border-blue-700",
    }
  }
}; 