import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import { api } from '@/services/api';
import { useRoomStore } from '@/stores/roomStore';

interface FileUploadProps {
  roomId: string;
  onUploadComplete?: () => void;
}

export function FileUpload({ roomId, onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addTrack } = useRoomStore();

  const handleFile = async (file: File) => {
    // Валидация формата
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac'];
    const allowedExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedExtensions.includes(fileExt) && !allowedTypes.includes(file.type)) {
      setError('Неподдерживаемый формат файла. Разрешенные: MP3, WAV, OGG, M4A, AAC, FLAC');
      return;
    }

    // Валидация размера (50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('Файл слишком большой. Максимальный размер: 50MB');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const track = await api.uploadTrack(roomId, file);
      addTrack(track);
      onUploadComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке файла');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-600 mb-2">
          {uploading ? 'Загрузка...' : 'Перетащите аудио файл сюда или нажмите для выбора'}
        </p>
        <p className="text-sm text-gray-500">
          Поддерживаемые форматы: MP3, WAV, OGG, M4A, AAC, FLAC (до 50MB)
        </p>
      </div>
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
