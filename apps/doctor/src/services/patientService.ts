export interface Patient {
  id: string;
  name: string;
  birthDate: string;
  insuranceNumber: string;
  address: string;
}

export class PatientService {
  static getMockPatients(): Patient[] {
    return [
      {
        id: 'pat-001',
        name: 'Anna Müller',
        birthDate: '1985-03-15',
        insuranceNumber: 'A123456789',
        address: 'Musterstraße 123, 12345 Berlin'
      },
      {
        id: 'pat-004',
        name: 'Ludger Königsstein',
        birthDate: '1985-03-15',
        insuranceNumber: 'K220635158',
        address: 'Holzweg 123, 12345 Berlin'
      },
      {
        id: 'pat-002',
        name: 'Hans Schmidt',
        birthDate: '1975-08-22',
        insuranceNumber: 'B987654321',
        address: 'Beispielweg 456, 54321 Hamburg'
      },
      {
        id: 'pat-003',
        name: 'Maria Weber',
        birthDate: '1990-12-05',
        insuranceNumber: 'C456789123',
        address: 'Testplatz 789, 98765 München'
      }
    ];
  }

  static getPatientById(id: string): Patient | undefined {
    return this.getMockPatients().find(patient => patient.id === id);
  }
}
