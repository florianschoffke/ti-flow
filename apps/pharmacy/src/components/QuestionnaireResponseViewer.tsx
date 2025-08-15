import { useState } from 'react';
import type { QuestionnaireResponse } from '../types';
import { PharmacyInfoService } from '../services/pharmacyInfoService';
import './QuestionnaireResponseViewer.css';

interface QuestionnaireResponseViewerProps {
  questionnaireResponse: QuestionnaireResponse;
  onClose?: () => void;
  onSubmit?: (updatedResponse: QuestionnaireResponse) => void;
}

export function QuestionnaireResponseViewer({ questionnaireResponse, onClose, onSubmit }: QuestionnaireResponseViewerProps) {
  const [editingFields, setEditingFields] = useState<{[linkId: string]: boolean}>({});
  const [fieldValues, setFieldValues] = useState<{[linkId: string]: string}>(() => {
    // Initialize field values from the questionnaire response
    const values: {[linkId: string]: string} = {};
    questionnaireResponse.item?.forEach(item => {
      if (item.answer && item.answer.length > 0) {
        const answer = item.answer[0];
        values[item.linkId] = answer.valueString || answer.valueDate || answer.valueInteger?.toString() || '';
      } else {
        values[item.linkId] = '';
      }
    });
    
    // Auto-fill pharmacy information for specific fields
    if (values['requester_name'] === '' || !values['requester_name']) {
      values['requester_name'] = PharmacyInfoService.getFormattedPharmacyName();
    }
    if (values['requester_tid'] === '' || !values['requester_tid']) {
      values['requester_tid'] = PharmacyInfoService.getPharmacyTelematikId();
    }
    
    return values;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const toggleEdit = (linkId: string) => {
    setEditingFields(prev => ({
      ...prev,
      [linkId]: !prev[linkId]
    }));
  };

  const handleFieldChange = (linkId: string, value: string) => {
    setFieldValues(prev => ({
      ...prev,
      [linkId]: value
    }));
  };

  const handleSubmit = async () => {
    if (!onSubmit) return;
    
    setIsSubmitting(true);
    try {
      // Create updated questionnaire response
      const updatedResponse: QuestionnaireResponse = {
        ...questionnaireResponse,
        status: 'completed',
        item: questionnaireResponse.item?.map(item => ({
          ...item,
          answer: fieldValues[item.linkId] ? [
            // Determine value type based on linkId patterns
            item.linkId.includes('date') 
              ? { valueDate: fieldValues[item.linkId] } // Store dates as valueDate
              : /^\d+$/.test(fieldValues[item.linkId])
              ? { valueInteger: parseInt(fieldValues[item.linkId]) || 0 }
              : { valueString: fieldValues[item.linkId] }
          ] : item.answer
        }))
      };

      await onSubmit(updatedResponse);
      handleClose();
    } catch (error) {
      console.error('❌ Failed to submit questionnaire:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldType = (linkId: string): string => {
    // Determine field type based on linkId patterns
    if (linkId.includes('date')) return 'date';
    if (linkId.includes('urgency')) return 'choice';
    if (linkId.includes('description') || linkId.includes('request')) return 'text';
    return 'string';
  };

  const getQuestionText = (linkId: string): string => {
    // Convert linkId to readable question text
    const linkIdMap: {[key: string]: string} = {
      'patient_name': 'Name des Patienten',
      'patient_kvnr': 'Krankenversichertennummer',
      'prescription_id': 'Rezept-ID',
      'medication_name': 'Verordnetes Medikament',
      'prescriber_name': 'Name des verordnenden Arztes',
      'prescriber_lanr': 'LANR des Arztes',
      'organization_name': 'Name der Einrichtung',
      'prescription_date': 'Verordnungsdatum',
      'change_request': 'Änderungswunsch',
      'urgency': 'Dringlichkeit',
      'requester_name': 'Name des Anfragenden',
      'requester_tid': 'Telematik ID'
    };
    
    return linkIdMap[linkId] || linkId.replace(/[_-]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  };

  // Check if field is auto-filled by pharmacy (AVS)
  const isPharmacyAutoFilled = (linkId: string): boolean => {
    return ['requester_name', 'requester_tid'].includes(linkId);
  };

  // Group fields logically
  const getFieldGroups = () => {
    const items = questionnaireResponse.item || [];
    
    const prescriptionFields = items.filter(item => 
      ['prescription_id', 'medication_name', 'prescription_date'].includes(item.linkId)
    );
    
    const patientFields = items.filter(item => 
      ['patient_name', 'patient_kvnr'].includes(item.linkId)
    );
    
    const prescriberFields = items.filter(item => 
      ['prescriber_name', 'prescriber_lanr', 'organization_name'].includes(item.linkId)
    );
    
    const pharmacyFields = items.filter(item => 
      ['requester_name', 'requester_tid'].includes(item.linkId)
    );
    
    const otherFields = items.filter(item => 
      !['prescription_id', 'medication_name', 'prescription_date', 
        'patient_name', 'patient_kvnr', 
        'prescriber_name', 'prescriber_lanr', 'organization_name',
        'requester_name', 'requester_tid'].includes(item.linkId)
    );

    return {
      prescription: prescriptionFields,
      patient: patientFields,
      prescriber: prescriberFields,
      pharmacy: pharmacyFields,
      other: otherFields
    };
  };

  const fieldGroups = getFieldGroups();

  const renderResponseItem = (item: any) => {
    const answer = item.answer?.[0];
    const hasAnswer = answer && (answer.valueString || answer.valueInteger !== undefined);
    const isPharmacyFilled = isPharmacyAutoFilled(item.linkId);
    const isEditing = editingFields[item.linkId] || (!hasAnswer && !isPharmacyFilled);
    const currentValue = fieldValues[item.linkId] || '';
    const fieldType = getFieldType(item.linkId);
    const questionText = getQuestionText(item.linkId);

    return (
      <div key={item.linkId} className={`questionnaire-response-item ${hasAnswer || isPharmacyFilled ? 'has-answer' : 'no-answer'} ${isPharmacyFilled ? 'pharmacy-filled' : ''}`}>
        <div className="question-header">
          <label className="question-label">
            {questionText}
            <span className="required-indicator">*</span>
          </label>
          
          {/* Show edit button only for non-pharmacy fields that have answers */}
          {hasAnswer && !isPharmacyFilled && (
            <button
              type="button"
              className={`edit-toggle-btn ${isEditing ? 'editing' : ''}`}
              onClick={() => toggleEdit(item.linkId)}
              title={isEditing ? 'Bearbeitung beenden' : 'Bearbeiten'}
            >
              {isEditing ? '✓' : '✏️'}
            </button>
          )}
          
          {/* Show appropriate badge based on field type */}
          {isPharmacyFilled ? (
            <span className="pharmacy-filled-badge">🏥 Vom AVS ausgefüllt</span>
          ) : hasAnswer && !isEditing && (
            <span className="prefilled-badge">🔄 Automatisch ausgefüllt</span>
          )}
        </div>

        <div className="question-input-container">
          {isEditing && !isPharmacyFilled ? (
            <>
              {fieldType === 'text' ? (
                <textarea
                  className="question-textarea"
                  value={currentValue}
                  onChange={(e) => handleFieldChange(item.linkId, e.target.value)}
                  placeholder={`Bitte ${questionText.toLowerCase()} eingeben...`}
                  rows={3}
                  maxLength={2000}
                />
              ) : fieldType === 'choice' ? (
                <select
                  className="question-select"
                  value={currentValue}
                  onChange={(e) => handleFieldChange(item.linkId, e.target.value)}
                >
                  <option value="">Bitte wählen...</option>
                  <option value="routine">Routine</option>
                  <option value="urgent">Dringend</option>
                  <option value="emergency">Notfall</option>
                </select>
              ) : (
                <input
                  type={fieldType === 'date' ? 'date' : 'text'}
                  className="question-input"
                  value={currentValue}
                  onChange={(e) => handleFieldChange(item.linkId, e.target.value)}
                  placeholder={`Bitte ${questionText.toLowerCase()} eingeben...`}
                />
              )}
              
              {fieldType === 'text' && (
                <div className="character-count">
                  {currentValue.length} / 2000 Zeichen
                </div>
              )}
            </>
          ) : (
            <div className={`question-display-value ${isPharmacyFilled ? 'pharmacy-readonly' : ''}`}>
              {currentValue || 'Keine Antwort'}
              {isPharmacyFilled && (
                <span className="readonly-indicator">
                  🔒 Schreibgeschützt
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="questionnaire-overlay">
      <div className="questionnaire-modal">
        <div className="questionnaire-header">
          <h2>📋 {questionnaireResponse.questionnaire}</h2>
          <button className="close-button" onClick={handleClose} aria-label="Schließen">
            ✕
          </button>
        </div>
        
        <div className="questionnaire-content">
          <div className="questionnaire-response-info">
            <div className="info-banner">
              <span className="info-icon">ℹ️</span>
              <div className="info-text">
                <strong>Bearbeitbarer Fragebogen</strong>
                <p>Automatisch ausgefüllte Felder können mit dem ✏️ Icon bearbeitet werden. 
                   🏥 Vom AVS ausgefüllte Felder sind schreibgeschützt.
                   Leere Felder sind sofort bearbeitbar.</p>
              </div>
            </div>
          </div>
          
          <div className="questionnaire-response-form">
            {/* Prescription Information Group */}
            {fieldGroups.prescription.length > 0 && (
              <div className="questionnaire-response-group">
                <h3 className="group-title">
                  <span className="group-icon">💊</span>
                  Verordnungsdaten
                </h3>
                <div className="group-content">
                  {fieldGroups.prescription.map(renderResponseItem)}
                </div>
              </div>
            )}

            {/* Patient Information Group */}
            {fieldGroups.patient.length > 0 && (
              <div className="questionnaire-response-group">
                <h3 className="group-title">
                  <span className="group-icon">👤</span>
                  Patientendaten
                </h3>
                <div className="group-content">
                  {fieldGroups.patient.map(renderResponseItem)}
                </div>
              </div>
            )}

            {/* Prescriber Information Group */}
            {fieldGroups.prescriber.length > 0 && (
              <div className="questionnaire-response-group">
                <h3 className="group-title">
                  <span className="group-icon">👨‍⚕️</span>
                  Verordnerdaten
                </h3>
                <div className="group-content">
                  {fieldGroups.prescriber.map(renderResponseItem)}
                </div>
              </div>
            )}

            {/* Pharmacy Information Group */}
            {fieldGroups.pharmacy.length > 0 && (
              <div className="questionnaire-response-group">
                <h3 className="group-title">
                  <span className="group-icon">🏥</span>
                  Apothekendaten (AVS)
                </h3>
                <div className="group-content">
                  {fieldGroups.pharmacy.map(renderResponseItem)}
                </div>
              </div>
            )}

            {/* Other Fields Group */}
            {fieldGroups.other.length > 0 && (
              <div className="questionnaire-response-group">
                <h3 className="group-title">
                  <span className="group-icon">📝</span>
                  Weitere Angaben
                </h3>
                <div className="group-content">
                  {fieldGroups.other.map(renderResponseItem)}
                </div>
              </div>
            )}
            
            {/* Handle nested items (groups) from questionnaire structure */}
            {questionnaireResponse.item?.filter(item => item.item && item.item.length > 0).map(groupItem => (
              <div key={groupItem.linkId} className="questionnaire-response-group">
                <h4>{getQuestionText(groupItem.linkId)}</h4>
                <div className="group-content">
                  {groupItem.item?.map(renderResponseItem)}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="questionnaire-actions">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Abbrechen
          </button>
          {onSubmit && (
            <button 
              type="button" 
              className={`btn btn-primary ${isSubmitting ? 'submitting' : ''}`}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? '🔄 Wird gesendet...' : '📤 Anfrage senden'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
