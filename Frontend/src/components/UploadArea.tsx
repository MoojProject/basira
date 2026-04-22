import React, { useState, useRef } from 'react';
import { UploadCloudIcon, FileUpIcon, AlertCircleIcon } from 'lucide-react';
import { FilePreview } from './FilePreview';
interface UploadAreaProps {
  onAnalyze: (file: File) => void;
}
export function UploadArea({ onAnalyze }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };
  const handleFileSelection = (file: File) => {
    setFileSizeError(null);
    if (file.size > 15 * 1024 * 1024) {
      setFileSizeError(
        'حجم الملف يتجاوز الحد الأقصى المسموح به (15 ميجابايت). يرجى اختيار ملف أصغر.'
      );
      return;
    }
    setSelectedFile(file);
  };
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileSizeError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold font-heading text-cream mb-4">
          ارفع عقدك للتحليل
        </h2>
        <p className="text-cream-dim">
          ندعم ملفات PDF،  الصور، والنصوص. سيتم تحليل العقد وتحديد البنود
          الخطرة والناقصة.
        </p>
      </div>

      {!selectedFile ?
      <div className="space-y-4">
          <div
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 ease-in-out cursor-pointer
              ${isDragging ? 'border-matcha bg-matcha/5 scale-[1.02]' : 'border-eclipse-3 bg-eclipse-2 hover:border-matcha/50 hover:bg-eclipse-3/30'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}>
          
            <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInput}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,image/*" />
          
            <div className="flex flex-col items-center justify-center space-y-4">
              <div
              className={`p-4 rounded-full ${isDragging ? 'bg-matcha/10 text-matcha' : 'bg-eclipse-3 text-cream-muted'}`}>
              
                <UploadCloudIcon className="w-10 h-10" />
              </div>
              <div>
                <p className="text-lg font-medium text-cream">
                  اسحب الملف هنا أو اضغط للاختيار
                </p>
                <p className="text-sm text-cream-muted mt-2">
                  PDF, JPG, PNG, (الحد الأقصى 15MB)
                </p>
              </div>
            </div>
          </div>
          {fileSizeError &&
        <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/30 rounded-xl text-danger text-sm">
              <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
              <p>{fileSizeError}</p>
            </div>
        }
        </div> :

      <div className="space-y-6 text-[#F7F1D9]">
          <FilePreview file={selectedFile} onRemove={handleRemoveFile} />

          <button
          onClick={() => onAnalyze(selectedFile)}
          className="w-full flex items-center justify-center px-8 py-4 bg-matcha text-eclipse rounded-xl font-heading font-extrabold text-lg hover:bg-matcha-light transition-colors shadow-md">
          
            <FileUpIcon className="w-5 h-5 ml-2" />
            ابدأ التحليل
          </button>
        </div>
      }
    </div>);

}