import React from 'react';
import { useTranslations } from '../LanguageContext';

export const PrivacyPolicyPage: React.FC = () => {
  const { t } = useTranslations();
  
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 text-gray-300">
      <h1 className="font-heading text-4xl font-bold text-white mb-8">{t('privacyPolicy.title')}</h1>
      
      <div className="space-y-6">
        <p className="text-lg">{t('privacyPolicy.intro')}</p>

        <section>
          <h2 className="text-2xl font-bold text-primary mb-2">{t('privacyPolicy.dataCollectionTitle')}</h2>
          <p>{t('privacyPolicy.dataCollectionText')}</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-primary mb-2">{t('privacyPolicy.cookiesTitle')}</h2>
          <p>{t('privacyPolicy.cookiesText')}</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-primary mb-2">{t('privacyPolicy.rightsTitle')}</h2>
          <p>{t('privacyPolicy.rightsText')}</p>
        </section>
        
         <section>
          <h2 className="text-2xl font-bold text-primary mb-2">{t('privacyPolicy.contactTitle')}</h2>
          <p>{t('privacyPolicy.contactText')}</p>
        </section>
      </div>
    </div>
  );
};
