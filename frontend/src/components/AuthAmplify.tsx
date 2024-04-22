import { SocialProvider } from '@aws-amplify/ui';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import React, { ReactElement, ReactNode, cloneElement } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseProps } from '../@types/common';

type Props = BaseProps & {
  socialProviders: SocialProvider[];
  children: ReactNode;
};

const AuthAmplify: React.FC<Props> = ({ socialProviders, children }) => {
  const { t } = useTranslation();
  const { signOut } = useAuthenticator();
  return (
    <Authenticator
      socialProviders={socialProviders}
      components={{
        Header: () => (
          <div className="mb-5 mt-10 flex justify-center text-3xl text-aws-font-color">
            {t('app.name')}
          </div>
        ),
      }}>
      <>{cloneElement(children as ReactElement, { signOut })}</>
    </Authenticator>
  );
};

export default AuthAmplify;
