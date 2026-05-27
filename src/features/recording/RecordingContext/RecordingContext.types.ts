// RecordingContext component and hook types

export interface UseRecordingContextReturn {
  todaySessionCount: number;
  nextRecordingNumber: number;
  isLoading: boolean;
  error: string | null;
}

export interface RecordingContextProps {
  todaySessionCount: number;
  nextRecordingNumber: number;
  isLoading: boolean;
}
