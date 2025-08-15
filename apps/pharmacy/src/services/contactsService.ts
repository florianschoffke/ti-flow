import contactsData from '../data/contacts.json';

export interface Contact {
  id: string;
  lanr: string;
  telematikId: string;
  name: string;
  firstName: string;
  lastName: string;
  title?: string;
  prefix?: string;
  specialty?: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
  };
  phone: string;
  email: string;
}

export class ContactsService {
  private contacts: Contact[] = contactsData;

  /**
   * Get all contacts
   */
  getAllContacts(): Contact[] {
    return this.contacts;
  }

  /**
   * Find contact by LANR
   */
  findByLanr(lanr: string): Contact | undefined {
    return this.contacts.find(contact => contact.lanr === lanr);
  }

  /**
   * Find contact by telematik ID
   */
  findByTelematikId(telematikId: string): Contact | undefined {
    return this.contacts.find(contact => contact.telematikId === telematikId);
  }

  /**
   * Search contacts by name (case-insensitive)
   */
  searchByName(searchTerm: string): Contact[] {
    const term = searchTerm.toLowerCase();
    return this.contacts.filter(contact => 
      contact.name.toLowerCase().includes(term) ||
      contact.firstName.toLowerCase().includes(term) ||
      contact.lastName.toLowerCase().includes(term)
    );
  }

  /**
   * Get contact suggestions for a given LANR (from prescription data)
   */
  getContactSuggestionForLanr(lanr: string): {
    contact: Contact | null;
    suggestion: {
      receiverName: string;
      receiverTelematikId: string;
    } | null;
  } {
    const contact = this.findByLanr(lanr);
    
    if (contact) {
      return {
        contact,
        suggestion: {
          receiverName: contact.name,
          receiverTelematikId: contact.telematikId
        }
      };
    }

    return {
      contact: null,
      suggestion: null
    };
  }
}
