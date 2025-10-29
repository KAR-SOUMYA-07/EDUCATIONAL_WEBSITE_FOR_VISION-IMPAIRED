import React, { useState, useRef } from 'react';
import { PythonBackendService } from '../services/PythonBackendService';

const SimpleBrailleGenerator: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [brailleOutput, setBrailleOutput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pythonBackend = new PythonBackendService();

  // Convert text to braille
  const generateBraille = async () => {
    if (!inputText.trim()) return;
    
    setIsProcessing(true);
    try {
      const result = await pythonBackend.translateToBraille(inputText);
      setBrailleOutput(result.braille || 'Translation failed');
    } catch (error) {
      setBrailleOutput('Error: ' + (error as Error).message);
    }
    setIsProcessing(false);
  };

  // Convert audio to braille
  const processAudio = async () => {
    if (!audioFile) return;
    
    setIsProcessing(true);
    try {
      const arrayBuffer = await audioFile.arrayBuffer();
      const result = await pythonBackend.processAudio(arrayBuffer);
      
      setInputText(result.text);
      setBrailleOutput(result.braille);
    } catch (error) {
      setBrailleOutput('Audio processing error: ' + (error as Error).message);
    }
    setIsProcessing(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAudioFile(file);
    }
  };

  return (
    <div className="card">
      <div className="card-padding">
        <h3 className="title-4">⠃⠗⠁⠊⠇⠇⠑ Generator</h3>
        
        {/* Text Input */}
        <div className="gap-2">
          <label className="body-2 text-bold">Enter Text:</label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type text here to convert to braille..."
            className="input-field"
            rows={3}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px' }}
          />
          <button
            onClick={generateBraille}
            disabled={!inputText.trim() || isProcessing}
            className="btn btn-primary"
          >
            {isProcessing ? 'Processing...' : 'Generate Braille'}
          </button>
        </div>

        {/* Audio Upload */}
        <div className="gap-2">
          <label className="body-2 text-bold">Or Upload Audio:</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            style={{ padding: '0.5rem' }}
          />
          <button
            onClick={processAudio}
            disabled={!audioFile || isProcessing}
            className="btn btn-secondary"
          >
            {isProcessing ? 'Processing...' : 'Convert Audio to Braille'}
          </button>
        </div>

        {/* Braille Output */}
        {brailleOutput && (
          <div className="gap-2">
            <label className="body-2 text-bold">Braille Output:</label>
            <div
              style={{
                background: 'rgba(79, 209, 199, 0.1)',
                padding: '1rem',
                borderRadius: '8px',
                fontFamily: 'Monaco, Consolas, monospace',
                fontSize: '1.2rem',
                lineHeight: '1.6',
                color: '#4fd1c7',
                border: '1px solid rgba(79, 209, 199, 0.3)',
                letterSpacing: '0.1em'
              }}
            >
              {brailleOutput}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleBrailleGenerator;