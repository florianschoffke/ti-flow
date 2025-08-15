import React, { useState } from 'react';
import './AnimatedButton.css';

type ButtonState = 'idle' | 'loading' | 'success';

interface AnimatedDownloadButtonProps {
  prescriptionId: string;
  prescriptionSecret: string;
}

export const AnimatedDownloadButton: React.FC<AnimatedDownloadButtonProps> = ({
  prescriptionId,
  prescriptionSecret
}) => {
  const [buttonState, setButtonState] = useState<ButtonState>('idle');

  const handleDownload = async () => {
    setButtonState('loading');
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate successful e-prescription retrieval
      console.log(`E-Rezept erfolgreich abgerufen:\nID: ${prescriptionId}\nSecret: ${prescriptionSecret}`);
      
      setButtonState('success');
      
      // Reset button after 3 seconds
      setTimeout(() => {
        setButtonState('idle');
      }, 3000);
      
    } catch (error) {
      console.error('Fehler beim Abrufen des E-Rezepts:', error);
      setButtonState('idle');
    }
  };

  return (
    <button 
      onClick={handleDownload}
      className={`animated-download-button ${buttonState}`}
      disabled={buttonState !== 'idle'}
    >
      <span className="button-content">
        {buttonState === 'idle' && (
          <>
            <span className="button-icon">💊</span>
            <span className="button-text">E-Rezept abrufen</span>
          </>
        )}
        {buttonState === 'loading' && (
          <span className="loading-spinner"></span>
        )}
        {buttonState === 'success' && (
          <>
            <span className="success-icon">✓</span>
            <span className="button-text">Erfolgreich abgerufen</span>
          </>
        )}
      </span>
    </button>
  );
};
