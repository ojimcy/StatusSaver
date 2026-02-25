import {create} from 'zustand';
import type {DeletedMessage, MessageFilter} from '../types';
import {
  getMessages,
  getMessagesByContact,
  getUniqueContacts,
} from '../services/MessageService';

interface MessageState {
  contacts: {name: string; count: number; lastMessage: string}[];
  currentMessages: DeletedMessage[];
  filter: MessageFilter;
  loading: boolean;

  fetchContacts: (packageName?: string) => Promise<void>;
  fetchMessages: (contactName: string, packageName?: string) => Promise<void>;
  setFilter: (filter: Partial<MessageFilter>) => void;
  searchMessages: (query: string, packageName?: string) => Promise<void>;
}

const initialFilter: MessageFilter = {
  searchQuery: '',
  contactName: null,
  dateFrom: null,
  dateTo: null,
};

const useMessageStore = create<MessageState>((set, get) => ({
  contacts: [],
  currentMessages: [],
  filter: initialFilter,
  loading: false,

  fetchContacts: async (packageName?: string) => {
    set({loading: true});
    try {
      const contacts = await getUniqueContacts(packageName);
      set({contacts, loading: false});
    } catch (error) {
      console.error('useMessageStore.fetchContacts failed:', error);
      set({loading: false});
    }
  },

  fetchMessages: async (contactName: string, packageName?: string) => {
    set({loading: true});
    try {
      const messages = await getMessagesByContact(contactName, packageName);
      set({currentMessages: messages, loading: false});
    } catch (error) {
      console.error('useMessageStore.fetchMessages failed:', error);
      set({loading: false});
    }
  },

  setFilter: (partial: Partial<MessageFilter>) => {
    const {filter} = get();
    set({filter: {...filter, ...partial}});
  },

  searchMessages: async (query: string, packageName?: string) => {
    set({loading: true});
    try {
      const {filter} = get();
      const updatedFilter: MessageFilter = {...filter, searchQuery: query};
      const messages = await getMessages(updatedFilter, packageName);
      set({currentMessages: messages, filter: updatedFilter, loading: false});
    } catch (error) {
      console.error('useMessageStore.searchMessages failed:', error);
      set({loading: false});
    }
  },
}));

export default useMessageStore;
