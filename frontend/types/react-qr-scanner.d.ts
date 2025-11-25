declare module 'react-qr-scanner' {
  import { Component } from 'react';

  export interface QrScannerProps {
    delay?: number;
    onError?: (error: any) => void;
    onScan?: (data: any) => void;
    style?: React.CSSProperties;
    className?: string;
    facingMode?: 'user' | 'environment';
    legacyMode?: boolean;
    resolution?: number;
    showViewFinder?: boolean;
    constraints?: MediaStreamConstraints;
  }

  export default class QrScanner extends Component<QrScannerProps> {}
}

