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
 * 2025 Update: Categories based on AVERAGE room rate (total revenue / total rooms)
 */
export interface CategoryRequirements {
  minRooms: number;
  minAverageRate: number; // Based on average rate, not individual room rates
  maxAverageRate: number;
  gstinRequired: boolean;
}

export const CATEGORY_REQUIREMENTS: Record<CategoryType, CategoryRequirements> = {
  diamond: {
    minRooms: 5, // Minimum 5 rooms for Diamond
    minAverageRate: 10000, // Average rate >₹10,000 (total revenue >₹50,000)
    maxAverageRate: Infinity,
    gstinRequired: true
  },
  gold: {
    minRooms: 1, // No minimum room requirement for Gold
    minAverageRate: 3000, // Average rate ₹3,000-₹10,000
    maxAverageRate: 10000,
    gstinRequired: true
  },
  silver: {
    minRooms: 1, // At least 1 room required
    minAverageRate: 0,
    maxAverageRate: 3000, // Average rate <₹3,000
    gstinRequired: false
  }
};

/**
 * Validate if a property meets category requirements
 * 2025 Update: Uses AVERAGE room rate for validation
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
  averageRoomRate: number
): CategoryValidationResult {
  const requirements = CATEGORY_REQUIREMENTS[selectedCategory];
  const errors: string[] = [];
  const warnings: string[] = [];
  let suggestedCategory: CategoryType | undefined;
  
  // Check minimum rooms
  if (totalRooms < requirements.minRooms) {
    errors.push(
      `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} category requires minimum ${requirements.minRooms} rooms. You have ${totalRooms} room${totalRooms === 1 ? '' : 's'}.`
    );
  }
  
  // Check average room rate range
  if (averageRoomRate < requirements.minAverageRate) {
    errors.push(
      `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} category requires average rate ≥₹${requirements.minAverageRate.toLocaleString('en-IN')}/night. Your average rate is ₹${Math.round(averageRoomRate).toLocaleString('en-IN')}/night.`
    );
    
    // Suggest lower category
    if (selectedCategory === 'diamond') {
      suggestedCategory = 'gold';
    } else if (selectedCategory === 'gold') {
      suggestedCategory = 'silver';
    }
  }
  
  if (requirements.maxAverageRate !== Infinity && averageRoomRate > requirements.maxAverageRate) {
    warnings.push(
      `Your average room rate (₹${Math.round(averageRoomRate).toLocaleString('en-IN')}) exceeds the typical ${selectedCategory} category maximum (₹${requirements.maxAverageRate.toLocaleString('en-IN')}). Consider upgrading to a higher category.`
    );
    
    // Suggest higher category
    if (selectedCategory === 'silver') {
      suggestedCategory = 'gold';
    } else if (selectedCategory === 'gold' && totalRooms >= 5) {
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
 * Suggest category based on room count and AVERAGE rates (2025 Rules)
 */
export function suggestCategory(
  totalRooms: number,
  averageRoomRate: number
): CategoryType {
  // Diamond: 5+ rooms AND average rate >₹10k/night (total revenue >₹50k)
  if (totalRooms >= 5 && averageRoomRate > 10000) {
    return 'diamond';
  }
  
  // Gold: Average rate ₹3k-10k/night (or high rate but fewer than 5 rooms)
  if (averageRoomRate >= 3000 && averageRoomRate <= 10000) {
    return 'gold';
  }
  
  // High average rate but not enough rooms for diamond → Gold
  if (averageRoomRate > 10000 && totalRooms < 5) {
    return 'gold';
  }
  
  // Silver: Average rate <₹3k/night
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
  totalRevenue: number;
}

export function calculateRoomRateStats(rooms: Array<{ rate: number }>): RoomRateStats {
  if (rooms.length === 0) {
    return { averageRate: 0, highestRate: 0, lowestRate: 0, totalRevenue: 0 };
  }
  
  const rates = rooms.map(r => r.rate);
  const total = rates.reduce((sum, rate) => sum + rate, 0);
  
  return {
    averageRate: Math.round(total / rates.length),
    highestRate: Math.max(...rates),
    lowestRate: Math.min(...rates),
    totalRevenue: total
  };
}

/**
 * Calculate average room rate from per-room-type details (2025 Rules)
 * Formula: Total Revenue / Total Rooms
 */
export interface RoomTypeDetails {
  singleBedRooms: number;
  singleBedRoomRate?: number;
  doubleBedRooms: number;
  doubleBedRoomRate?: number;
  familySuites: number;
  familySuiteRate?: number;
}

export interface AverageRateResult {
  totalRooms: number;
  totalRevenue: number;
  averageRate: number;
  highestRate: number;
  lowestRate: number;
}

export function calculateAverageRoomRate(roomDetails: RoomTypeDetails): AverageRateResult {
  const totalRooms = (roomDetails.singleBedRooms || 0) + 
                     (roomDetails.doubleBedRooms || 0) + 
                     (roomDetails.familySuites || 0);
  
  if (totalRooms === 0) {
    return {
      totalRooms: 0,
      totalRevenue: 0,
      averageRate: 0,
      highestRate: 0,
      lowestRate: 0
    };
  }
  
  // Calculate total revenue per night
  const singleRevenue = (roomDetails.singleBedRooms || 0) * (roomDetails.singleBedRoomRate || 0);
  const doubleRevenue = (roomDetails.doubleBedRooms || 0) * (roomDetails.doubleBedRoomRate || 0);
  const suiteRevenue = (roomDetails.familySuites || 0) * (roomDetails.familySuiteRate || 0);
  const totalRevenue = singleRevenue + doubleRevenue + suiteRevenue;
  
  // Calculate average rate per room
  const averageRate = totalRevenue / totalRooms;
  
  // Find highest and lowest rates (excluding zero rates)
  const rates: number[] = [];
  if (roomDetails.singleBedRooms && roomDetails.singleBedRoomRate) rates.push(roomDetails.singleBedRoomRate);
  if (roomDetails.doubleBedRooms && roomDetails.doubleBedRoomRate) rates.push(roomDetails.doubleBedRoomRate);
  if (roomDetails.familySuites && roomDetails.familySuiteRate) rates.push(roomDetails.familySuiteRate);
  
  const highestRate = rates.length > 0 ? Math.max(...rates) : 0;
  const lowestRate = rates.length > 0 ? Math.min(...rates) : 0;
  
  return {
    totalRooms,
    totalRevenue,
    averageRate: Math.round(averageRate * 100) / 100,
    highestRate,
    lowestRate
  };
}
