import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { FileUpload } from 'primereact/fileupload';
import { ProgressBar } from 'primereact/progressbar';
import * as XLSX from 'xlsx';
import useAuth from '../hooks/useAuth'; // Importar el hook de autenticación

const UploadModal = ({ visible, onHide, onUpload, template }) => {
  const { grupos } = useAuth();
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = ({ files }) => {
    const file = files[0];
    const reader = new FileReader();
    setLoading(true);

    reader.onload = (e) => {
      const workbook = XLSX.read(e.target.result, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet);
      
      // Convertir fechas de números de serie de Excel a formato de fecha legible
      const convertedData = json.map(worker => {
        if (worker['fecha de contratacion']) {
          worker['fecha de contratacion'] = excelDateToJSDate(worker['fecha de contratacion']);
        }
        return worker;
      });
      
      setFileData(convertedData);
      setLoading(false);
    };

    reader.readAsBinaryString(file);
  };

  const excelDateToJSDate = (serial) => {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;                                        
    const date_info = new Date(utc_value * 1000);

    const fractional_day = serial - Math.floor(serial) + 0.0000001;

    let total_seconds = Math.floor(86400 * fractional_day);

    const seconds = total_seconds % 60;

    total_seconds -= seconds;

    const hours = Math.floor(total_seconds / (60 * 60));
    const minutes = Math.floor(total_seconds / 60) % 60;

    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds).toISOString().split('T')[0];
  };

  const handleConfirmUpload = () => {
    setLoading(true);
    const groupId = grupos.length > 0 ? grupos[0].id : null; // Obtener el ID del primer grupo
    const dataWithGroupId = fileData.map(worker => ({
      ...worker,
      grupo_id: groupId
    }));

    onUpload(dataWithGroupId).finally(() => {
      setLoading(false);
      onHide();
    });
  };

  const handleTemplateDownload = () => {
    const link = document.createElement('a');
    link.href = template;
    link.download = 'Libro.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog visible={visible} onHide={onHide} header="Subida Masiva" style={{ width: '50vw' }}>
      {loading && <ProgressBar mode="indeterminate" />}
      <div className="p-field" style={{ marginBottom: '20px' }}>
        <label htmlFor="fileUpload">Subir archivo Excel</label>
        <FileUpload 
          name="file" 
          customUpload 
          uploadHandler={handleUpload} 
          accept=".xlsx"
          chooseLabel="Elegir"
          uploadLabel="Subir"
          cancelLabel="Cancelar"
          invalidFileSizeMessageDetail="El tamaño del archivo excede el límite permitido."
          invalidFileLimitMessageDetail="El número de archivos excede el límite permitido."
          chooseOptions={{ label: '+ Elegir', icon: 'pi pi-fw pi-paperclip' }}
          uploadOptions={{ label: 'Subir', icon: 'pi pi-fw pi-cloud-upload' }}
          cancelOptions={{ label: 'Cancelar', icon: 'pi pi-fw pi-times' }}
        />
      </div>
      <div className="p-field" style={{ marginBottom: '20px' }}>

        <Button label="Descargar plantilla de ejemplo" icon="pi pi-download" onClick={handleTemplateDownload} />
      </div>
      {fileData && (
        <div className="p-field" style={{ marginBottom: '20px' }}>
          <h5>Vista previa de los datos</h5>
          <pre>{JSON.stringify(fileData, null, 2)}</pre>
        </div>
      )}
      <div className="p-field">
        <Button label="Confirmar subida" icon="pi pi-check" onClick={handleConfirmUpload} disabled={!fileData || loading} />
      </div>
    </Dialog>
  );
};

export default UploadModal;