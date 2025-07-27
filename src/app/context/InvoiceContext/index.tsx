'use client'
import React, { createContext, useContext, useEffect, useState } from 'react';
import { InvoiceList, order } from '@/app/(DashboardLayout)/types/apps/invoice';
import axios from '@/utils/axios';
import toast from 'react-hot-toast';
import { useAuthContext } from '../AuthContext';

interface InvoiceContextType {
    invoices: InvoiceList[];
    loading: boolean;
    error: string | null;
    fetchInvoices: () => Promise<void>;
    deleteInvoice: (id: string) => Promise<void>;
    addInvoice: (newInvoice: any) => Promise<void>;
    updateInvoice: (id: string, updatedInvoice: any) => Promise<void>;
}

export const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

export const InvoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [invoices, setInvoices] = useState<InvoiceList[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user, isAuthenticated } = useAuthContext();

    // Function to fetch all invoices
    const fetchInvoices = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get('/api/invoices');

            if (response.data.success) {
                setInvoices(response.data.data);
            } else {
                setError(response.data.message || 'Failed to fetch invoices');
                toast.error('Failed to fetch invoices');
            }
        } catch (error: any) {
            // Don't show error toast for authentication errors (401)
            if (error.response?.status !== 401) {
                const errorMessage = error.response?.data?.message || 'Error fetching invoices';
                setError(errorMessage);
                toast.error(errorMessage);
            } else {
                setError('Authentication required');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Only fetch invoices if user is authenticated
        if (isAuthenticated && user) {
            fetchInvoices();
        }
    }, [isAuthenticated, user]);

    // Function to delete an invoice
    const deleteInvoice = async (id: string) => {
        try {
            setLoading(true);
            const response = await axios.delete(`/api/invoices/${id}`);

            if (response.data.success) {
                setInvoices((prevInvoices) => prevInvoices.filter((invoice) => invoice._id !== id));
                toast.success('Invoice deleted successfully');
            } else {
                toast.error(response.data.message || 'Failed to delete invoice');
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Error deleting invoice';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Function to add a new invoice
    const addInvoice = async (newInvoice: any) => {
        try {
            setLoading(true);
            const response = await axios.post('/api/invoices', newInvoice);

            if (response.data.success) {
                setInvoices((prevInvoices) => [...prevInvoices, response.data.data]);
                toast.success('Invoice created successfully');
            } else {
                toast.error(response.data.message || 'Failed to create invoice');
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Error creating invoice';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Function to update an invoice
    const updateInvoice = async (id: string, updatedInvoice: any) => {
        try {
            setLoading(true);
            const response = await axios.put(`/api/invoices/${id}`, updatedInvoice);

            if (response.data.success) {
                setInvoices((prevInvoices) =>
                    prevInvoices.map((invoice) => (invoice._id === id ? response.data.data : invoice))
                );
                toast.success('Invoice updated successfully');
            } else {
                toast.error(response.data.message || 'Failed to update invoice');
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Error updating invoice';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <InvoiceContext.Provider value={{
            invoices,
            loading,
            error,
            fetchInvoices,
            deleteInvoice,
            addInvoice,
            updateInvoice
        }}>
            {children}
        </InvoiceContext.Provider>
    );
};
