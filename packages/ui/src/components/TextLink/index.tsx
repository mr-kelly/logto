import React, { ReactChildren } from 'react';
import classNames from 'classnames';
import styles from './index.module.scss';

export type Props = {
  className?: string;
  children: ReactChildren;
  href: string;
};

const TextLink = ({ className, children, href }: Props) => {
  return (
    <a className={classNames(styles.link, className)} href={href}>
      {children}
    </a>
  );
};

export default TextLink;