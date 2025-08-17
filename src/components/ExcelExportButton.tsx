import React, { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import { Download, FileSpreadsheet } from 'lucide-react';

interface ExcelExportButtonProps {
  className?: string;
}

export default function ExcelExportButton({ className = "" }: ExcelExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const exportMocsToExcel = useAction(api.excel.exportMocsToExcel);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportMocsToExcel();
      
      // Convert base64 to blob
      const byteCharacters = atob(result.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: result.mimeType });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Excel file "${result.filename}" downloaded successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export MOCs: ${(error as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`btn btn-outline-primary flex items-center gap-2 ${className}`}
      title="Export all MOCs to Excel spreadsheet"
    >
      {isExporting ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          Exporting...
        </>
      ) : (
        <>
          <FileSpreadsheet size={18} />
          <Download size={16} />
          Export to Excel
        </>
      )}
    </button>
  );
}
