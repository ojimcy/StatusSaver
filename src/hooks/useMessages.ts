import {useEffect, useCallback} from 'react';
import useMessageStore from '../store/useMessageStore';

export default function useMessages() {
  const {
    contacts,
    currentMessages,
    loading,
    fetchContacts,
    fetchMessages,
    searchMessages,
  } = useMessageStore();

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const search = useCallback(
    (query: string) => {
      return searchMessages(query);
    },
    [searchMessages],
  );

  return {
    contacts,
    messages: currentMessages,
    loading,
    fetchContacts,
    fetchMessages,
    search,
  };
}
