import React, { useState, useEffect, useRef } from 'react';
import { getNotasCompartidas, guardarNotasCompartidas } from '../services/apiService';
import '../styles/NotesModal.css';

const NotesModal = ({ isOpen, onClose }) => {
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const saveTimeoutRef = useRef(null);

    // Load notes from server on mount
    useEffect(() => {
        if (isOpen) {
            loadNotes();
        }
    }, [isOpen]);

    const loadNotes = async () => {
        try {
            setLoading(true);
            const notasFromServer = await getNotasCompartidas();
            setNotes(notasFromServer || '');
        } catch (error) {
            console.error('Error cargando notas:', error);
            setNotes('');
        } finally {
            setLoading(false);
        }
    };

    // Auto-save notes with debounce
    useEffect(() => {
        if (loading) return; // Don't save while loading

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await guardarNotasCompartidas(notes);
                console.log('📝 Notas guardadas');
            } catch (error) {
                console.error('Error guardando notas:', error);
            }
        }, 500);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [notes, loading]);

    const handleClearAll = async () => {
        try {
            setNotes('');
            await guardarNotasCompartidas('');
            console.log('📝 Todas las notas borradas');
        } catch (error) {
            console.error('Error borrando notas:', error);
        }
    };

    return (
        <aside className={`notes-panel${!isOpen ? ' hidden' : ''}`}>
            <div className="notes-panel-header">
                <h2>📝 Notas Compartidas</h2>
                <button className="notes-close-btn" onClick={onClose}>✕</button>
            </div>
            <div className="notes-panel-body">
                {loading ? (
                    <div className="notes-loading">Cargando notas...</div>
                ) : (
                    <textarea
                        className="notes-textarea"
                        placeholder="Escribe tus notas aquí... Se guardarán automáticamente y serán visibles para todos los usuarios."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        autoFocus
                    />
                )}
            </div>
            <div className="notes-panel-footer">
                <span className="notes-autosave-indicator">
                    💾 Guardado automático (compartido)
                </span>
                <button className="notes-clear-btn" onClick={handleClearAll}>
                    🗑️ Borrar todo
                </button>
            </div>
        </aside>
    );
};

export default NotesModal;
