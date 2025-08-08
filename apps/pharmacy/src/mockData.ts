import type { Patient, Prescription } from './types';

export const mockPatient: Patient = {
  id: '1',
  firstName: 'Maria',
  lastName: 'Mustermann',
  dateOfBirth: '15.03.1985',
  address: 'Musterstraße 123, 12345 Berlin',
  insuranceNumber: 'A123456789'
};

export const mockPrescriptions: Prescription[] = [
  {
    id: 'rx-001',
    patientId: '1',
    medication: 'Ibuprofen 400mg',
    dosage: '1 Tablette, 3x täglich',
    quantity: 30,
    doctor: 'Dr. med. Schmidt',
    issueDate: '08.08.2025',
    status: 'pending',
    compositionType: 'e16A'
  },
  {
    id: 'rx-002',
    patientId: '1',
    medication: 'Amoxicillin 500mg',
    dosage: '1 Kapsel, 2x täglich',
    quantity: 20,
    doctor: 'Dr. med. Wagner',
    issueDate: '07.08.2025',
    status: 'pending',
    compositionType: 'e16A'
  },
  {
    id: 'rx-003',
    patientId: '1',
    medication: 'Vitamin D3 1000 IE',
    dosage: '1 Tablette täglich',
    quantity: 60,
    doctor: 'Dr. med. Mueller',
    issueDate: '06.08.2025',
    status: 'pending',
    compositionType: 'e16A'
  }
];
