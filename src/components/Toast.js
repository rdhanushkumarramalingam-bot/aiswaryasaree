'use client';

import { AnimatePresence, motion } from "framer-motion";
import { Check, X, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

export default function Toast({ message, type = "success", onClose }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            style={{
                position: 'fixed',
                top: '1.5rem',
                right: '1.5rem',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem 1.5rem',
                borderRadius: '1rem',
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                maxWidth: '400px'
            }}
        >
            <div style={{
                padding: '0.5rem',
                borderRadius: '50%',
                background: type === 'success' ? 'hsl(142 76% 90%)' : 'hsl(0 84% 90%)',
                color: type === 'success' ? 'hsl(142 76% 36%)' : 'hsl(0 84% 60%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inner 0 0 4px rgba(0,0,0,0.1)'
            }}>
                {type === 'success' ? <Check size={18} strokeWidth={3} /> : <AlertCircle size={18} strokeWidth={3} />}
            </div>
            <div>
                <h4 style={{ fontWeight: 700, fontSize: '0.975rem', color: 'hsl(var(--text-main))' }}>
                    {type === 'success' ? 'Success' : 'Attention'}
                </h4>
                <p style={{ fontSize: '0.875rem', color: 'hsl(var(--text-muted))', marginTop: '0.1rem' }}>{message}</p>
            </div>
            <button
                onClick={onClose}
                style={{
                    marginLeft: 'auto',
                    color: 'hsl(var(--text-muted))',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    borderRadius: '50%',
                    display: 'flex'
                }}
            >
                <X size={16} />
            </button>
        </motion.div>
    );
}
