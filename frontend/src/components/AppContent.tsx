import React, { useCallback } from 'react';
import { PiList, PiPlus } from 'react-icons/pi';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { BaseProps } from '../@types/common';
import useChat from '../hooks/useChat';
import useConversation from '../hooks/useConversation';
import useDrawer from '../hooks/useDrawer';
import SnackbarProvider from '../providers/SnackbarProvider';
import ButtonIcon from './ButtonIcon';
import ChatListDrawer from './ChatListDrawer';
import LazyOutputText from './LazyOutputText';

type Props = BaseProps & {
  signOut?: () => void;
};

const AppContent: React.FC<Props> = (props) => {
  const { switchOpen: switchDrawer } = useDrawer();
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const { getTitle } = useConversation();
  const { isGeneratedTitle } = useChat();

  const onClickNewChat = useCallback(() => {
    navigate('/');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-dvh relative flex w-screen bg-aws-paper">
      <ChatListDrawer
        onSignOut={() => {
          props.signOut ? props.signOut() : null;
        }}
      />

      <main className="min-h-dvh relative flex-1 overflow-y-hidden transition-width">
        <header className="visible flex h-12 w-full items-center bg-aws-squid-ink p-3 text-lg text-aws-font-color-white lg:hidden lg:h-0">
          <button
            className="mr-2 rounded-full p-2 hover:brightness-50 focus:outline-none focus:ring-1 "
            onClick={() => {
              switchDrawer();
            }}>
            <PiList />
          </button>

          <div className="flex grow justify-center">
            {isGeneratedTitle ? (
              <>
                <LazyOutputText text={getTitle(conversationId ?? '')} />
              </>
            ) : (
              <>{getTitle(conversationId ?? '')}</>
            )}
          </div>

          <ButtonIcon onClick={onClickNewChat}>
            <PiPlus />
          </ButtonIcon>
        </header>

        <div
          className="h-full overflow-hidden overflow-y-auto  text-aws-font-color"
          id="main">
          <SnackbarProvider>
            <Outlet />
          </SnackbarProvider>
        </div>
      </main>
    </div>
  );
};

export default AppContent;
