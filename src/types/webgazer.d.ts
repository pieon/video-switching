declare module 'webgazer' {
  interface WebGazer {
    setRegression(regressionType: string): WebGazer;
    setTracker(trackerType: string): WebGazer;
    setGazeListener(listener: (data: any, clock: number) => void): WebGazer;
    begin(): Promise<void>;
    showVideoPreview(show: boolean): WebGazer;
    showPredictionPoints(show: boolean): WebGazer;
    showFaceOverlay(show: boolean): WebGazer;
    showFaceFeedbackBox(show: boolean): WebGazer;
    pause(): void;
    resume(): void;
    end(): void;
    clearData(): void;
    getCurrentPrediction(): any;
    params: {
      showVideo: boolean;
      showFaceOverlay: boolean;
      showFaceFeedbackBox: boolean;
      showGazeDot: boolean;
    };
  }

  const webgazer: WebGazer;
  export default webgazer;
}
