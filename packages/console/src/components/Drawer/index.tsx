import React from 'react';
import ReactModal from 'react-modal';

import Close from '@/icons/Close';

import IconButton from '../IconButton';
import * as styles from './index.module.scss';

type Props = {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
};

const Drawer = ({ isOpen, onClose, children }: Props) => {
  return (
    <ReactModal
      shouldCloseOnOverlayClick
      isOpen={isOpen}
      className={styles.content}
      overlayClassName={styles.overlay}
      onRequestClose={onClose}
    >
      <div className={styles.headline}>
        <IconButton
          size="large"
          onClick={() => {
            onClose?.();
          }}
        >
          <Close />
        </IconButton>
      </div>
      <div>{children}</div>
    </ReactModal>
  );
};

export default Drawer;