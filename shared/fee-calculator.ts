/**
 * 2025 Homestay Fee Calculator
 * 
 * Implements HP Homestay Rules 2025 fee structure:
 * - Flat fees based on category + location (no per-room charges)
 * - GST already included in base fees
 * - 3-year discount: 10%
 * - Female owner discount: 5%
 * - Pangi sub-division discount: 50%
 */

export type CategoryType = 'diamond' | 'gold' | 'silver';
export type LocationType = 'mc' | 'tcp' | 'gp';

export interface FeeCalculationInput {
  category: CategoryType;
  locationType: LocationType;
  validityYears: 1 | 3;
  ownerGender: 'male' | 'female' | 'other';
  isPangiSubDivision: boolean;
}

export interface FeeBreakdown {
  // Base fee structure
  baseFee: number; // Annual fee from matrix
  totalBeforeDiscounts: number; // baseFee × validityYears
  
  // Discount breakdown
  validityDiscount: number; // 10% for 3-year lump sum
  femaleOwnerDiscount: number; // 5% for female owners
  pangiDiscount: number; // 50% for Pangi sub-division
  totalDiscount: number; // Sum of all discounts
  
  // Final amount
  finalFee: number; // Total payable
  
  // Metadata
  savingsAmount: number; // Total savings from discounts
  savingsPercentage: number; // % saved
}

/**
 * 2025 Fee Matrix - Flat fees by category and location
 * GST (18%) already included in these amounts
 */
const FEE_MATRIX: Record<CategoryType, Record<LocationType, number>> = {
  diamond: {
    mc: 18000,  // Municipal Corporation
    tcp: 12000, // TCP/SDA/Nagar Panchayat
    gp: 10000   // Gram Panchayat
  },
  gold: {
    mc: 12000,
    tcp: 8000,
    gp: 6000
  },
  silver: {
    mc: 8000,
    tcp: 5000,
    gp: 3000
  }
};

/**
 * Calculate homestay registration fee based on 2025 Rules
 */
export function calculateHomestayFee(input: FeeCalculationInput): FeeBreakdown {
  // Step 1: Get base fee from matrix
  const baseFee = FEE_MATRIX[input.category][input.locationType];
  
  // Step 2: Calculate total for validity period
  let totalBeforeDiscounts = baseFee * input.validityYears;
  
  // Step 3: Apply 3-year discount (10% if applicable)
  let validityDiscount = 0;
  if (input.validityYears === 3) {
    validityDiscount = totalBeforeDiscounts * 0.10;
  }
  
  // Step 4: Apply female owner discount (5% if applicable)
  // Applied AFTER validity discount
  let femaleOwnerDiscount = 0;
  if (input.ownerGender === 'female') {
    const afterValidityDiscount = totalBeforeDiscounts - validityDiscount;
    femaleOwnerDiscount = afterValidityDiscount * 0.05;
  }
  
  // Step 5: Apply Pangi discount (50% if applicable)
  // Applied AFTER validity and female discounts
  let pangiDiscount = 0;
  if (input.isPangiSubDivision) {
    const afterPreviousDiscounts = totalBeforeDiscounts - validityDiscount - femaleOwnerDiscount;
    pangiDiscount = afterPreviousDiscounts * 0.50;
  }
  
  // Calculate totals
  const totalDiscount = validityDiscount + femaleOwnerDiscount + pangiDiscount;
  const finalFee = totalBeforeDiscounts - totalDiscount;
  
  const savingsAmount = totalDiscount;
  const savingsPercentage = totalBeforeDiscounts > 0 
    ? (totalDiscount / totalBeforeDiscounts) * 100 
    : 0;
  
  return {
    baseFee,
    totalBeforeDiscounts,
    validityDiscount: Math.round(validityDiscount * 100) / 100,
    femaleOwnerDiscount: Math.round(femaleOwnerDiscount * 100) / 100,
    pangiDiscount: Math.round(pangiDiscount * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    finalFee: Math.round(finalFee * 100) / 100,
    savingsAmount: Math.round(savingsAmount * 100) / 100,
    savingsPercentage: Math.round(savingsPercentage * 100) / 100
  };
}

/**
 * Category requirement validation
 */
export interface CategoryRequirements {
  minRooms: number;
  minRoomRate: number;
  maxRoomRate: number;
  gstinRequired: boolean;
}

export const CATEGORY_REQUIREMENTS: Record<CategoryType, CategoryRequirements> = {
  diamond: {
    minRooms: 5,
    minRoomRate: 10000,
    maxRoomRate: Infinity,
    gstinRequired: true
  },
  gold: {
    minRooms: 3,
    minRoomRate: 3000,
    maxRoomRate: 10000,
    gstinRequired: true
  },
  silver: {
    minRooms: 1,
    minRoomRate: 0,
    maxRoomRate: 3000,
    gstinRequired: false
  }
};

/**
 * Validate if a property meets category requirements
 */
export interface CategoryValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestedCategory?: CategoryType;
}

export function validateCategorySelection(
  selectedCategory: CategoryType,
  totalRooms: number,
  highestRoomRate: number
): CategoryValidationResult {
  const requirements = CATEGORY_REQUIREMENTS[selectedCategory];
  const errors: string[] = [];
  const warnings: string[] = [];
  let suggestedCategory: CategoryType | undefined;
  
  // Check minimum rooms
  if (totalRooms < requirements.minRooms) {
    errors.push(
      `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} category requires minimum ${requirements.minRooms} rooms. You have ${totalRooms} rooms.`
    );
  }
  
  // Check room rate range
  if (highestRoomRate < requirements.minRoomRate) {
    warnings.push(
      `Your highest room rate (₹${highestRoomRate}) is below the typical ${selectedCategory} category range (₹${requirements.minRoomRate}+).`
    );
    
    // Suggest lower category
    if (selectedCategory === 'diamond') {
      suggestedCategory = 'gold';
    } else if (selectedCategory === 'gold') {
      suggestedCategory = 'silver';
    }
  }
  
  if (requirements.maxRoomRate !== Infinity && highestRoomRate > requirements.maxRoomRate) {
    warnings.push(
      `Your highest room rate (₹${highestRoomRate}) exceeds the typical ${selectedCategory} category range (up to ₹${requirements.maxRoomRate}).`
    );
    
    // Suggest higher category
    if (selectedCategory === 'silver') {
      suggestedCategory = 'gold';
    } else if (selectedCategory === 'gold') {
      suggestedCategory = 'diamond';
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestedCategory
  };
}

/**
 * Suggest category based on room count and rates
 */
export function suggestCategory(
  totalRooms: number,
  highestRoomRate: number
): CategoryType {
  // Diamond: 5+ rooms, >₹10k/night
  if (totalRooms >= 5 && highestRoomRate > 10000) {
    return 'diamond';
  }
  
  // Gold: 3+ rooms, ₹3k-10k/night (or high rate but fewer rooms)
  if (totalRooms >= 3 || (totalRooms >= 1 && highestRoomRate >= 3000)) {
    if (highestRoomRate >= 3000 && highestRoomRate <= 10000) {
      return 'gold';
    }
    // High rate but not enough rooms for diamond
    if (highestRoomRate > 10000 && totalRooms < 5) {
      return 'gold';
    }
  }
  
  // Silver: 1-2 rooms, <₹3k/night
  return 'silver';
}

/**
 * Format fee amount for display
 */
export function formatFee(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Get location type display name
 */
export function getLocationTypeDisplay(locationType: LocationType): string {
  const displayNames: Record<LocationType, string> = {
    mc: 'Municipal Corporation',
    tcp: 'TCP/SDA/Nagar Panchayat',
    gp: 'Gram Panchayat'
  };
  return displayNames[locationType];
}

/**
 * Calculate room rate statistics from room details
 */
export interface RoomRateStats {
  averageRate: number;
  highestRate: number;
  lowestRate: number;
}

export function calculateRoomRateStats(rooms: Array<{ rate: number }>): RoomRateStats {
  if (rooms.length === 0) {
    return { averageRate: 0, highestRate: 0, lowestRate: 0 };
  }
  
  const rates = rooms.map(r => r.rate);
  const total = rates.reduce((sum, rate) => sum + rate, 0);
  
  return {
    averageRate: Math.round(total / rates.length),
    highestRate: Math.max(...rates),
    lowestRate: Math.min(...rates)
  };
}
