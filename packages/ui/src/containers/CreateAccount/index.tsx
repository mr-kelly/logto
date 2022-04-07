/**
 * TODO:
 * 1. API redesign handle api error and loading status globally in PageContext
 * 2. Input field validation, should move the validation rule to the input field scope
 * 3. Forgot password URL
 * 4. Read terms of use settings from SignInExperience Settings
 */

import classNames from 'classnames';
import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { useTranslation } from 'react-i18next';

import { register } from '@/apis/register';
import Button from '@/components/Button';
import { ErrorType } from '@/components/ErrorMessage';
import Input from '@/components/Input';
import PasswordInput from '@/components/Input/PasswordInput';
import TermsOfUse from '@/components/TermsOfUse';
import PageContext from '@/hooks/page-context';
import useApi from '@/hooks/use-api';

import * as styles from './index.module.scss';

type FieldState = {
  username: string;
  password: string;
  confirmPassword: string;
  termsAgreement: boolean;
};

type ErrorState = {
  [key in keyof FieldState]?: ErrorType;
};

type FieldValidations = {
  [key in keyof FieldState]?: (state: FieldState) => ErrorType | undefined;
};

const defaultState = {
  username: '',
  password: '',
  confirmPassword: '',
  termsAgreement: false,
};

const usernameRegx = /^[A-Z_a-z-][\w-]*$/;

const CreateAccount = () => {
  const { t, i18n } = useTranslation(undefined, { keyPrefix: 'main_flow' });
  const [fieldState, setFieldState] = useState<FieldState>(defaultState);
  const [fieldErrors, setFieldErrors] = useState<ErrorState>({});

  const { setToast } = useContext(PageContext);

  const { loading, error, result, run: asyncRegister } = useApi(register);

  const validations = useMemo<FieldValidations>(
    () => ({
      username: ({ username }) => {
        if (!username) {
          return { code: 'required', data: { field: t('input.username') } };
        }

        if (/\d/.test(username.slice(0, 1))) {
          return 'username_should_not_start_with_number';
        }

        if (!usernameRegx.test(username)) {
          return 'username_valid_charset';
        }
      },
      password: ({ password }) => {
        if (!password) {
          return { code: 'required', data: { field: t('input.password') } };
        }

        if (password.length < 6) {
          return { code: 'password_min_length', data: { min: 6 } };
        }
      },
      confirmPassword: ({ password, confirmPassword }) => {
        if (password !== confirmPassword) {
          return { code: 'passwords_do_not_match' };
        }
      },
      termsAgreement: ({ termsAgreement }) => {
        if (!termsAgreement) {
          return 'agree_terms_required';
        }
      },
    }),
    [t]
  );

  const onSubmitHandler = useCallback(() => {
    // Should be removed after api redesign
    if (loading) {
      return;
    }

    // Validates
    const usernameError = validations.username?.(fieldState);
    const passwordError = validations.password?.(fieldState);

    if (usernameError || passwordError) {
      setFieldErrors((previous) => ({
        ...previous,
        username: usernameError,
        password: passwordError,
      }));

      return;
    }

    const confirmPasswordError = validations.confirmPassword?.(fieldState);

    if (confirmPasswordError) {
      setFieldErrors((previous) => ({ ...previous, confirmPassword: confirmPasswordError }));

      return;
    }

    const termsAgreementError = validations.termsAgreement?.(fieldState);

    if (termsAgreementError) {
      setFieldErrors((previous) => ({
        ...previous,
        termsAgreement: termsAgreementError,
      }));

      return;
    }

    void asyncRegister(fieldState.username, fieldState.password);
  }, [fieldState, loading, validations, asyncRegister]);

  useEffect(() => {
    if (result?.redirectTo) {
      window.location.assign(result.redirectTo);
    }
  }, [result]);

  useEffect(() => {
    // Clear errors
    for (const key of Object.keys(fieldState) as [keyof FieldState]) {
      setFieldErrors((previous) => {
        if (!previous[key]) {
          return previous;
        }
        const error = validations[key]?.(fieldState);

        return { ...previous, [key]: error };
      });
    }
  }, [fieldState, validations]);

  useEffect(() => {
    // TODO: username exist error message
    if (error) {
      setToast(t('error.username_exists'));
    }
  }, [error, i18n, setToast, t]);

  return (
    <form className={styles.form}>
      <Input
        className={classNames(styles.inputField, fieldErrors.username && styles.withError)}
        name="username"
        autoComplete="username"
        placeholder={t('input.username')}
        value={fieldState.username}
        error={fieldErrors.username}
        onChange={({ target }) => {
          if (target instanceof HTMLInputElement) {
            const { value } = target;
            setFieldState((state) => ({ ...state, username: value }));
          }
        }}
        onClear={() => {
          setFieldState((state) => ({ ...state, username: '' }));
        }}
      />
      <PasswordInput
        forceHidden
        className={classNames(styles.inputField, fieldErrors.password && styles.withError)}
        name="password"
        autoComplete="current-password"
        placeholder={t('input.password')}
        value={fieldState.password}
        error={fieldErrors.password}
        onChange={({ target }) => {
          if (target instanceof HTMLInputElement) {
            const { value } = target;
            setFieldState((state) => ({ ...state, password: value }));
          }
        }}
      />
      <PasswordInput
        forceHidden
        className={classNames(styles.inputField, fieldErrors.confirmPassword && styles.withError)}
        name="confirm_password"
        autoComplete="current-password"
        placeholder={t('input.confirm_password')}
        value={fieldState.confirmPassword}
        error={fieldErrors.confirmPassword}
        onChange={({ target }) => {
          if (target instanceof HTMLInputElement) {
            const { value } = target;
            setFieldState((state) => ({ ...state, confirmPassword: value }));
          }
        }}
      />
      <TermsOfUse
        name="termsAgreement"
        className={classNames(styles.terms, fieldErrors.termsAgreement && styles.withError)}
        termsOfUse={{ enabled: true, contentUrl: '/' }}
        isChecked={fieldState.termsAgreement}
        error={fieldErrors.termsAgreement}
        onChange={(checked) => {
          setFieldState((state) => ({ ...state, termsAgreement: checked }));
        }}
      />

      <Button onClick={onSubmitHandler}>{t('action.create')}</Button>
    </form>
  );
};

export default CreateAccount;