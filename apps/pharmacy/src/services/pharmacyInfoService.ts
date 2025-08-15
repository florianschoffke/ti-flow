import pharmacyInfoData from '../data/pharmacyInfo.json';

export interface PharmacyInfo {
  name: string;
  owner: string;
  telematikId: string;
  address: {
    street: string;
    postalCode: string;
    city: string;
    country: string;
  };
  contact: {
    phone: string;
    email: string;
    website: string;
  };
  certificationInfo: {
    avsCertified: boolean;
    certificationDate: string;
    certificationAuthority: string;
  };
}

/**
 * Service to get pharmacy information for auto-filling questionnaire fields
 */
export class PharmacyInfoService {
  private static pharmacyInfo: PharmacyInfo = pharmacyInfoData.pharmacyInfo;

  /**
   * Get the pharmacy name for requester_name field
   */
  static getPharmacyName(): string {
    return this.pharmacyInfo.name;
  }

  /**
   * Get the pharmacy Telematik-ID for requester_tid field
   */
  static getPharmacyTelematikId(): string {
    return this.pharmacyInfo.telematikId;
  }

  /**
   * Get the pharmacy owner name
   */
  static getPharmacyOwner(): string {
    return this.pharmacyInfo.owner;
  }

  /**
   * Get full pharmacy information
   */
  static getFullPharmacyInfo(): PharmacyInfo {
    return this.pharmacyInfo;
  }

  /**
   * Check if the pharmacy is AVS certified
   */
  static isAvsCertified(): boolean {
    return this.pharmacyInfo.certificationInfo.avsCertified;
  }

  /**
   * Get formatted pharmacy display name (name + owner)
   */
  static getFormattedPharmacyName(): string {
    return `${this.pharmacyInfo.name} (${this.pharmacyInfo.owner})`;
  }
}
