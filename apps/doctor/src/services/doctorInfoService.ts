import doctorData from '../data/doctorInfo.json';

export interface DoctorInfo {
  practitioner: {
    telematikId: string;
    lanr: string;
    name: {
      title: string;
      firstName: string;
      lastName: string;
      prefix: string;
      fullName: string;
    };
    qualification: string;
  };
  organization: {
    name: string;
    bsnr: string;
    address: {
      street: string;
      houseNumber: string;
      postalCode: string;
      city: string;
      country: string;
    };
    contact: {
      phone: string;
      fax: string;
      email: string;
    };
  };
}

export class DoctorInfoService {
  private static doctorInfo: DoctorInfo = doctorData;

  /**
   * Get the complete doctor information
   */
  static getDoctorInfo(): DoctorInfo {
    return this.doctorInfo;
  }

  /**
   * Get the doctor's telematik ID
   */
  static getDoctorTelematikId(): string {
    return this.doctorInfo.practitioner.telematikId;
  }

  /**
   * Get the doctor's LANR
   */
  static getDoctorLanr(): string {
    return this.doctorInfo.practitioner.lanr;
  }

  /**
   * Get the doctor's full name
   */
  static getDoctorName(): string {
    return this.doctorInfo.practitioner.name.fullName;
  }

  /**
   * Get the doctor's qualification
   */
  static getDoctorQualification(): string {
    return this.doctorInfo.practitioner.qualification;
  }

  /**
   * Get the organization name
   */
  static getOrganizationName(): string {
    return this.doctorInfo.organization.name;
  }

  /**
   * Get the organization's BSNR
   */
  static getOrganizationBsnr(): string {
    return this.doctorInfo.organization.bsnr;
  }

  /**
   * Get the formatted organization address
   */
  static getFormattedAddress(): string {
    const addr = this.doctorInfo.organization.address;
    return `${addr.street} ${addr.houseNumber}, ${addr.postalCode} ${addr.city}`;
  }

  /**
   * Get the organization contact information
   */
  static getContactInfo() {
    return this.doctorInfo.organization.contact;
  }
}
