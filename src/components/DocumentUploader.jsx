import { useState } from 'react';
import { Upload, message } from 'antd';
import { Paperclip, Download, Trash2, Eye } from 'lucide-react';
import { uploadFile, deleteFile } from '../lib/storage';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function DocumentUploader({ docs = [], dir, onChange, label = 'Добавить документ', disabled = false }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async ({ file }) => {
    setUploading(true);
    try {
      const doc = await uploadFile(file, dir);
      onChange([...docs, doc]);
      message.success(`«${file.name}» загружен`);
    } catch (e) {
      message.error('Ошибка загрузки: ' + (e.message ?? e));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc) => {
    await deleteFile(doc.path);
    onChange(docs.filter(d => d.id !== doc.id));
  };

  return (
    <div>
      {docs.map(doc => {
        const isImage = IMAGE_TYPES.includes(doc.contentType);
        return (
          <div key={doc.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 0', borderBottom: '1px solid var(--line)',
          }}>
            {isImage ? (
              <img src={doc.url} alt={doc.name} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 7, border: '1px solid var(--line)', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: 7, background: 'var(--glass)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Paperclip size={16} strokeWidth={1.7} style={{ color: 'var(--txt-mid)' }} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
              {doc.uploadedAt && (
                <div className="faint" style={{ fontSize: 10.5, marginTop: 1 }}>
                  {new Date(doc.uploadedAt).toLocaleDateString('ru-RU')}
                </div>
              )}
            </div>
            <a href={doc.url} target="_blank" rel="noreferrer" title="Открыть" style={iconBtn()}>
              <Eye size={14} strokeWidth={1.8} />
            </a>
            <a href={doc.url} download={doc.name} title="Скачать" style={iconBtn()}>
              <Download size={14} strokeWidth={1.8} />
            </a>
            {!disabled && (
              <button onClick={() => handleDelete(doc)} title="Удалить" style={iconBtn(true)}>
                <Trash2 size={14} strokeWidth={1.8} />
              </button>
            )}
          </div>
        );
      })}

      {!disabled && (
        <Upload
          customRequest={handleUpload}
          showUploadList={false}
          multiple={false}
          accept="image/*,.pdf,.doc,.docx"
        >
          <button disabled={uploading} style={{
            marginTop: docs.length ? 10 : 0,
            display: 'inline-flex', alignItems: 'center', gap: 7,
            fontSize: 12, fontWeight: 600, padding: '8px 13px', borderRadius: 10,
            background: 'var(--glass)', border: '1px solid var(--line)',
            color: uploading ? 'var(--txt-faint)' : 'var(--txt-mid)', cursor: uploading ? 'default' : 'pointer',
          }}>
            <Paperclip size={13} strokeWidth={2} />
            {uploading ? 'Загрузка...' : label}
          </button>
        </Upload>
      )}
    </div>
  );
}

function iconBtn(danger) {
  return {
    width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center',
    background: danger ? 'rgba(240,104,106,.08)' : 'var(--glass)',
    border: `1px solid ${danger ? 'rgba(240,104,106,.25)' : 'var(--line)'}`,
    color: danger ? 'var(--bad)' : 'var(--txt-mid)',
    cursor: 'pointer', flexShrink: 0, textDecoration: 'none',
  };
}
