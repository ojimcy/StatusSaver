import {useEffect, useCallback} from 'react';
import useMessageStore from '../store/useMessageStore';
import useSettingsStore from '../store/useSettingsStore';
import {markAllReadByContact} from '../services/MessageService';

const VARIANT_TO_PACKAGE = {
  whatsapp: 'com.whatsapp',
  business: 'com.whatsapp.w4b',
} as const;

export default function useMessages() {
  const {
    contacts,
    currentMessages,
    loading,
    fetchContacts,
    fetchMessages,
    searchMessages,
  } = useMessageStore();
  const selectedVariant = useSettingsStore(s => s.selectedVariant);
  const packageName = VARIANT_TO_PACKAGE[selectedVariant];

  useEffect(() => {
    fetchContacts(packageName);
  }, [fetchContacts, packageName]);

  const search = useCallback(
    (query: string) => {
      return searchMessages(query, packageName);
    },
    [searchMessages, packageName],
  );

  const fetchContactsForVariant = useCallback(
    () => fetchContacts(packageName),
    [fetchContacts, packageName],
  );

  const fetchMessagesForVariant = useCallback(
    (contactName: string) => fetchMessages(contactName, packageName),
    [fetchMessages, packageName],
  );

  const markContactRead = useCallback(
    async (contactName: string) => {
      await markAllReadByContact(contactName, packageName);
      fetchContacts(packageName);
    },
    [fetchContacts, packageName],
  );

  return {
    contacts,
    messages: currentMessages,
    loading,
    fetchContacts: fetchContactsForVariant,
    fetchMessages: fetchMessagesForVariant,
    markContactRead,
    search,
  };
}
