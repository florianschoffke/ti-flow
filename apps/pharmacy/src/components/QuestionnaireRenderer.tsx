import { useState } from 'react';
import type { Questionnaire, QuestionnaireItem, Prescription } from '../types';
import { tiFlowService } from '../services/tiFlowService';

interface QuestionnaireRendererProps {
  questionnaire: Questionnaire;
  prescription: Prescription | null;
  operationCode: string;
  onClose: () => void;
  onRequestSubmitted?: () => void;
}

interface FormData {
  [linkId: string]: string;
}

interface GroupInstance {
  [linkId: string]: string | { value: string; unit: string };
}

export function QuestionnaireRenderer({ questionnaire, prescription, operationCode, onClose, onRequestSubmitted }: QuestionnaireRendererProps) {
  const [formData, setFormData] = useState<FormData>(() => {
    // Pre-populate form with available data
    const initialData: FormData = {};
    
    questionnaire.item.forEach(item => {
      if (item.code?.[0]?.code === 'patient_name') {
        // Use prescription data if available, otherwise leave empty for manual entry
        if (prescription) {
          initialData[item.linkId] = `Patient für ${prescription.medication}`;
        }
      } else if (item.code?.[0]?.code === 'prescription_id') {
        if (prescription) {
          initialData[item.linkId] = prescription.id;
        }
      } else if (item.code?.[0]?.code === 'original_prescription_id') {
        if (prescription) {
          initialData[item.linkId] = prescription.id;
        }
      } else if (item.code?.[0]?.code === 'requester_name') {
        initialData[item.linkId] = 'Apotheke Musterapotheke';
      } else if (item.code?.[0]?.code === 'requester_tid') {
        // Auto-populate TID from pharmacy system
        initialData[item.linkId] = '3-SMC-B-Testkarte-883110000116873';
      }
      // Add more pre-population logic as needed
    });
    
    return initialData;
  });
  
  // State for repeating groups
  const [groupInstances, setGroupInstances] = useState<{ [groupLinkId: string]: GroupInstance[] }>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (linkId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [linkId]: value
    }));
  };

  const handleGroupInputChange = (groupLinkId: string, instanceIndex: number, linkId: string, value: string) => {
    setGroupInstances(prev => {
      const updatedGroups = { ...prev };
      if (!updatedGroups[groupLinkId]) {
        updatedGroups[groupLinkId] = [];
      }
      if (!updatedGroups[groupLinkId][instanceIndex]) {
        updatedGroups[groupLinkId][instanceIndex] = {};
      }
      updatedGroups[groupLinkId][instanceIndex][linkId] = value;
      return updatedGroups;
    });
  };

  const handleGroupQuantityChange = (groupLinkId: string, instanceIndex: number, linkId: string, field: 'value' | 'unit', value: string) => {
    setGroupInstances(prev => {
      const updatedGroups = { ...prev };
      if (!updatedGroups[groupLinkId]) {
        updatedGroups[groupLinkId] = [];
      }
      if (!updatedGroups[groupLinkId][instanceIndex]) {
        updatedGroups[groupLinkId][instanceIndex] = {};
      }
      
      const currentValue = updatedGroups[groupLinkId][instanceIndex][linkId];
      const quantityValue = typeof currentValue === 'object' ? currentValue : { value: '', unit: '' };
      
      updatedGroups[groupLinkId][instanceIndex][linkId] = {
        ...quantityValue,
        [field]: value
      };
      
      return updatedGroups;
    });
  };

  const getFieldValue = (instance: GroupInstance, linkId: string, field?: 'value' | 'unit'): string => {
    const value = instance[linkId];
    if (field && typeof value === 'object') {
      return value[field] || '';
    }
    return typeof value === 'string' ? value : '';
  };

  const addGroupInstance = (groupLinkId: string) => {
    setGroupInstances(prev => {
      const updatedGroups = { ...prev };
      if (!updatedGroups[groupLinkId]) {
        updatedGroups[groupLinkId] = [];
      }
      updatedGroups[groupLinkId].push({});
      return updatedGroups;
    });
  };

  const removeGroupInstance = (groupLinkId: string, instanceIndex: number) => {
    setGroupInstances(prev => {
      const updatedGroups = { ...prev };
      if (updatedGroups[groupLinkId]) {
        updatedGroups[groupLinkId].splice(instanceIndex, 1);
      }
      return updatedGroups;
    });
  };

  const getFieldHint = (item: QuestionnaireItem): string | null => {
    const code = item.code?.[0]?.code;
    
    switch (code) {
      case 'requester_tid':
        return 'aus AVS geladen';
      case 'requester_name':
        return 'aus Apothekensystem';
      case 'prescription_id':
        return 'aus E-Rezept';
      default:
        return null;
    }
  };

  const renderQuestionnaireItem = (item: QuestionnaireItem) => {
    const value = formData[item.linkId] || '';
    const hint = getFieldHint(item);
    const isAutoPopulated = hint !== null;
    
    switch (item.type) {
      case 'string':
        return (
          <div key={item.linkId} className="questionnaire-item">
            <label htmlFor={item.linkId} className="questionnaire-label">
              {item.text}
            </label>
            <input
              id={item.linkId}
              type="text"
              value={value}
              onChange={(e) => handleInputChange(item.linkId, e.target.value)}
              className={`questionnaire-input ${isAutoPopulated ? 'auto-populated' : ''}`}
              readOnly={isAutoPopulated}
            />
            {hint && (
              <div className="field-hint">
                {hint}
              </div>
            )}
          </div>
        );
      
      case 'text':
        return (
          <div key={item.linkId} className="questionnaire-item">
            <label htmlFor={item.linkId} className="questionnaire-label">
              {item.text}
            </label>
            <textarea
              id={item.linkId}
              value={value}
              onChange={(e) => handleInputChange(item.linkId, e.target.value)}
              className={`questionnaire-textarea ${isAutoPopulated ? 'auto-populated' : ''}`}
              rows={3}
              readOnly={isAutoPopulated}
            />
            {hint && (
              <div className="field-hint">
                {hint}
              </div>
            )}
          </div>
        );
      
      case 'group':
        const instances = groupInstances[item.linkId] || [];
        return (
          <div key={item.linkId} className="questionnaire-group">
            <div className="group-header">
              <h3 className="group-title">{item.text}</h3>
              {item.repeats && (
                <button
                  type="button"
                  onClick={() => addGroupInstance(item.linkId)}
                  className="btn-add-instance"
                >
                  + Hinzufügen
                </button>
              )}
            </div>
            
            {instances.length === 0 && item.repeats && (
              <div className="no-instances">
                <p>Keine Einträge vorhanden.</p>
                <button
                  type="button"
                  onClick={() => addGroupInstance(item.linkId)}
                  className="btn-add-first"
                >
                  Ersten Eintrag hinzufügen
                </button>
              </div>
            )}
            
            {instances.map((instance, instanceIndex) => (
              <div key={`${item.linkId}-${instanceIndex}`} className="group-instance">
                <div className="instance-header">
                  <span className="instance-number">Eintrag {instanceIndex + 1}</span>
                  {item.repeats && instances.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGroupInstance(item.linkId, instanceIndex)}
                      className="btn-remove-instance"
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                <div className="instance-fields">
                  {item.item?.map(childItem => {
                    if (childItem.type === 'display') {
                      return (
                        <div key={childItem.linkId} className="help-text">
                          {childItem.text}
                        </div>
                      );
                    }
                    
                    return (
                      <div key={childItem.linkId} className="questionnaire-item">
                        <label className="questionnaire-label">
                          {childItem.text}
                          {childItem.required && <span className="required">*</span>}
                        </label>
                        
                        {childItem.type === 'integer' && (
                          <input
                            type="number"
                            value={getFieldValue(instance, childItem.linkId)}
                            onChange={(e) => handleGroupInputChange(item.linkId, instanceIndex, childItem.linkId, e.target.value)}
                            className="questionnaire-input"
                          />
                        )}
                        
                        {childItem.type === 'string' && (
                          <input
                            type="text"
                            value={getFieldValue(instance, childItem.linkId)}
                            onChange={(e) => handleGroupInputChange(item.linkId, instanceIndex, childItem.linkId, e.target.value)}
                            className="questionnaire-input"
                          />
                        )}
                        
                        {childItem.type === 'choice' && (
                          <select
                            value={getFieldValue(instance, childItem.linkId)}
                            onChange={(e) => handleGroupInputChange(item.linkId, instanceIndex, childItem.linkId, e.target.value)}
                            className="questionnaire-select"
                          >
                            <option value="">-- Auswählen --</option>
                            {/* Add options here when available */}
                          </select>
                        )}
                        
                        {childItem.type === 'quantity' && (
                          <div className="quantity-input-group">
                            <input
                              type="number"
                              value={getFieldValue(instance, childItem.linkId, 'value')}
                              onChange={(e) => handleGroupQuantityChange(item.linkId, instanceIndex, childItem.linkId, 'value', e.target.value)}
                              className="questionnaire-input quantity-value"
                              placeholder="Menge"
                            />
                            <input
                              type="text"
                              value={getFieldValue(instance, childItem.linkId, 'unit')}
                              onChange={(e) => handleGroupQuantityChange(item.linkId, instanceIndex, childItem.linkId, 'unit', e.target.value)}
                              className="questionnaire-input quantity-unit"
                              placeholder="Einheit (z.B. mg, ml)"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {!item.repeats && item.item && (
              <div className="static-group">
                {item.item.map(childItem => {
                  if (childItem.type === 'display') {
                    return (
                      <div key={childItem.linkId} className="help-text">
                        {childItem.text}
                      </div>
                    );
                  }
                  
                  const childValue = formData[childItem.linkId] || '';
                  
                  return (
                    <div key={childItem.linkId} className="questionnaire-item">
                      <label className="questionnaire-label">
                        {childItem.text}
                        {childItem.required && <span className="required">*</span>}
                      </label>
                      <input
                        type={childItem.type === 'integer' ? 'number' : 'text'}
                        value={childValue}
                        onChange={(e) => handleInputChange(childItem.linkId, e.target.value)}
                        className="questionnaire-input"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <div key={item.linkId} className="questionnaire-item">
            <label className="questionnaire-label">{item.text}</label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleInputChange(item.linkId, e.target.value)}
              className={`questionnaire-input ${isAutoPopulated ? 'auto-populated' : ''}`}
              readOnly={isAutoPopulated}
            />
            {hint && (
              <div className="field-hint">
                {hint}
              </div>
            )}
          </div>
        );
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Create FHIR QuestionnaireResponse with proper handling of groups
      const responseItems: any[] = [];
      
      // Add regular form fields
      Object.entries(formData).forEach(([linkId, value]) => {
        responseItems.push({
          linkId,
          answer: [{ valueString: value }]
        });
      });
      
      // Add group instances
      Object.entries(groupInstances).forEach(([groupLinkId, instances]) => {
        instances.forEach((instance) => {
          const groupItem: any = {
            linkId: groupLinkId,
            item: []
          };
          
          Object.entries(instance).forEach(([childLinkId, childValue]) => {
            if (typeof childValue === 'object' && childValue.value !== undefined) {
              // Handle quantity values
              const quantity = {
                value: parseFloat(childValue.value) || 0,
                unit: childValue.unit || ''
              };
              groupItem.item.push({
                linkId: childLinkId,
                answer: [{ valueQuantity: quantity }]
              });
            } else {
              // Handle string values
              groupItem.item.push({
                linkId: childLinkId,
                answer: [{ valueString: childValue }]
              });
            }
          });
          
          responseItems.push(groupItem);
        });
      });
      console.log('📝 Submitting flow request with operation:', operationCode);
      
      const result = await tiFlowService.submitFlowRequest(operationCode);
      console.log('✅ Flow request submitted successfully:', result);
      
      // Call the callback to refresh active requests list
      if (onRequestSubmitted) {
        onRequestSubmitted();
      }
      
      // Close the form
      onClose();
      
    } catch (error) {
      console.error('❌ Failed to submit flow request:', error);
      // You could add error handling/notification here
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="questionnaire-overlay">
      <div className="questionnaire-modal">
        <div className="questionnaire-header">
          <h2>{questionnaire.title}</h2>
          <button className="close-button" onClick={onClose} aria-label="Schließen">
            ✕
          </button>
        </div>
        
        <div className="questionnaire-content">
          {prescription && (
            <div className="prescription-context">
              <strong>Betreffendes Rezept:</strong> {prescription.medication} ({prescription.id})
            </div>
          )}
          
          <form className="questionnaire-form">
            {questionnaire.item.map(renderQuestionnaireItem)}
          </form>
        </div>
        
        <div className="questionnaire-actions">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Abbrechen
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Wird gesendet...' : 'Senden'}
          </button>
        </div>
      </div>
    </div>
  );
}
