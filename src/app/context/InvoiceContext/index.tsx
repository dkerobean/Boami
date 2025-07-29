'use client'
import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
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
    const pathname = usePathname();

    // Helper function to determine if invoices should be loaded based on current route
    const shouldLoadInvoices = () => {
        // Don't load on auth pages
        if (pathname?.startsWith('/auth') || pathname?.startsWith('/login')) {
            return false;
        }
        
        // Don't load on landing pages
        if (pathname?.startsWith('/landingpage') || pathname === '/') {
            return false;
        }
        
        // Only load when authenticated and on dashboard/invoice-related pages
        return isAuthenticated && user && pathname?.startsWith('/dashboards');
    };

    // Function to fetch all invoices
    const fetchInvoices = async () => {
        // Don't fetch if we're not in the right context
        if (!shouldLoadInvoices()) {
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const response = await axios.get('/api/invoices');

            if (response.data.success) {
                setInvoices(response.data.data);
            } else {
                const errorMessage = response.data.message || 'Failed to fetch invoices';
                setError(errorMessage);
                
                // Only show error toast if we're on dashboard pages where users expect invoice data
                if (pathname?.includes('invoice') || pathname?.includes('finance')) {
                    toast.error(errorMessage);
                }
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Error fetching invoices';
            
            // Handle different error types
            if (error.response?.status === 401) {
                // Authentication error - don't show toast, just set error state
                setError('Authentication required');
                return;
            } else if (error.response?.status >= 500) {
                // Server error
                setError('Server error - please try again later');
            } else if (error.response?.status === 404) {
                // Not found - might be normal for new users
                setError(null);
                setInvoices([]);
                return;
            } else {
                setError(errorMessage);
            }
            
            // Only show error toast if we're on pages where users expect invoice data
            if (pathname?.includes('invoice') || pathname?.includes('finance')) {
                toast.error(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Only fetch invoices if we should load them based on route and auth status
        if (shouldLoadInvoices()) {
            fetchInvoices();
        }
    }, [isAuthenticated, user, pathname]);

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
