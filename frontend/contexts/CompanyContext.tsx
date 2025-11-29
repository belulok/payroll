'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useCompanies } from '@/hooks/useCompanies';
import feathersClient from '@/lib/feathers';

interface Company {
  _id: string;
  name: string;
  registrationNumber?: string;
  workerCount?: number;
}

interface CompanyContextType {
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company | null) => void;
  companies: Company[];
  loading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Use the same hook as Companies page for consistency
  const { data: companies = [], isLoading: loading } = useCompanies();

  // Custom setter that also saves to localStorage
  const handleSetSelectedCompany = (company: Company | null) => {
    setSelectedCompany(company);
    if (company) {
      localStorage.setItem('selectedCompanyId', company._id);
    } else {
      localStorage.removeItem('selectedCompanyId');
    }
  };

  // Auto-select company when companies are loaded
  useEffect(() => {
    const autoSelectCompany = async () => {
      if (companies.length > 0 && !selectedCompany) {
        try {
          // First, check localStorage for previously selected company
          const savedCompanyId = localStorage.getItem('selectedCompanyId');
          if (savedCompanyId) {
            const savedCompany = companies.find((c: Company) => c._id === savedCompanyId);
            if (savedCompany) {
              setSelectedCompany(savedCompany);
              return;
            }
          }

          // If no saved company, auto-select based on user's company
          const auth = await feathersClient.reAuthenticate();

          // If user has a company, select it
          if (auth.user.company) {
            const userCompany = companies.find((c: Company) => c._id === auth.user.company);
            const companyToSelect = userCompany || companies[0];
            setSelectedCompany(companyToSelect);
            localStorage.setItem('selectedCompanyId', companyToSelect._id);
          } else {
            setSelectedCompany(companies[0]);
            localStorage.setItem('selectedCompanyId', companies[0]._id);
          }
        } catch (error) {
          console.error('Error auto-selecting company:', error);
          setSelectedCompany(companies[0]);
          if (companies[0]) {
            localStorage.setItem('selectedCompanyId', companies[0]._id);
          }
        }
      }
    };

    autoSelectCompany();
  }, [companies, selectedCompany]);

  return (
    <CompanyContext.Provider value={{ selectedCompany, setSelectedCompany: handleSetSelectedCompany, companies, loading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}

