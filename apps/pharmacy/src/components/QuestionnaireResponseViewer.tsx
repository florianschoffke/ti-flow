import type { QuestionnaireResponse } from '../types';

interface QuestionnaireResponseViewerProps {
  questionnaireResponse: QuestionnaireResponse;
  onClose?: () => void;
}

export function QuestionnaireResponseViewer({ questionnaireResponse, onClose }: QuestionnaireResponseViewerProps) {
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const renderResponseItem = (item: any) => {
    const answer = item.answer?.[0];
    let displayValue = 'Keine Antwort';

    if (answer) {
      if (answer.valueString) {
        displayValue = answer.valueString;
      } else if (answer.valueInteger !== undefined) {
        displayValue = answer.valueInteger.toString();
      } else if (answer.valueBoolean !== undefined) {
        displayValue = answer.valueBoolean ? 'Ja' : 'Nein';
      } else if (answer.valueQuantity) {
        displayValue = `${answer.valueQuantity.value} ${answer.valueQuantity.unit}`;
      }
    }

    return (
      <div key={item.linkId} className="questionnaire-response-item">
        <label className="questionnaire-response-label">
          {item.linkId.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
        </label>
        <div className="questionnaire-response-value">
          {displayValue}
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
            <p><strong>Status:</strong> {questionnaireResponse.status}</p>
            <p><strong>Typ:</strong> Antwort auf Fragebogen</p>
          </div>
          
          <div className="questionnaire-response-form">
            <h3>Eingereichte Daten:</h3>
            {questionnaireResponse.item.map(renderResponseItem)}
            
            {/* Handle nested items (groups) */}
            {questionnaireResponse.item.filter(item => item.item && item.item.length > 0).map(groupItem => (
              <div key={groupItem.linkId} className="questionnaire-response-group">
                <h4>{groupItem.linkId.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</h4>
                {groupItem.item?.map(renderResponseItem)}
              </div>
            ))}
          </div>
        </div>
        
        <div className="questionnaire-actions">
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleClose}
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
