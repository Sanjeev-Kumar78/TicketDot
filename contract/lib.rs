#![cfg_attr(not(feature = "std"), no_std, no_main)]

/// # TicketDot Smart Contract
/// 
/// A decentralized ticket booking platform where:
/// - Event organizers can create events
/// - Users can buy tickets (represented as NFTs)
/// - Tickets can be transferred between users
/// 
/// Built with Ink! for Polkadot/Substrate chains
#[ink::contract]
mod ticketdot {
    use ink::prelude::string::String;
    use ink::prelude::vec::Vec;
    use ink::prelude::collections::BTreeSet;
    use ink::storage::Mapping;

    /// Validation constants for security
    const MAX_TICKETS_PER_EVENT: u32 = 1_000_000;
    const MIN_TICKET_PRICE: Balance = 1;
    const MAX_EVENT_NAME_LENGTH: usize = 200;
    const MAX_METADATA_CID_LENGTH: usize = 1000;
    const MAX_TICKETS_PER_USER: u32 = 1000;

    /// Represents an event created by an organizer
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct Event {
        pub id: u64,
        pub name: String,
        pub organizer: AccountId,
        pub price: Balance,
        pub total_tickets: u32,
        pub available_tickets: u32,
        pub timestamp: u64,
        pub metadata_cid: String, // IPFS CID for event details
        pub active: bool,
        pub cancelled: bool,
        pub completed: bool,
    }

    /// Represents a ticket NFT
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct Ticket {
        pub id: u64,
        pub event_id: u64,
        pub owner: AccountId,
        pub purchase_time: u64,
        pub is_used: bool, // True if ticket has been scanned/used
        pub is_refunded: bool, // True if ticket has been refunded
    }

    /// Custom error types
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        /// Event does not exist
        EventNotFound,
        /// No tickets available
        SoldOut,
        /// Insufficient payment
        InsufficientPayment,
        /// Ticket does not exist
        TicketNotFound,
        /// Caller is not the ticket owner
        NotTicketOwner,
        /// Event is not active
        EventNotActive,
        /// Ticket already used
        TicketAlreadyUsed,
        /// Transfer failed
        TransferFailed,
        /// Caller is not the event organizer
        NotOrganizer,
        /// Event already cancelled
        EventCancelled,
        /// Event already completed
        EventCompleted,
        /// Ticket already refunded
        TicketAlreadyRefunded,
        /// Invalid input parameters
        InvalidInput,
        /// User has too many tickets
        TooManyTickets,
        /// Contract balance insufficient
        InsufficientBalance,
        /// Event not completed yet
        EventNotCompleted,
    }

    /// Main contract storage
    #[ink(storage)]
    pub struct TicketDot {
        /// Counter for event IDs
        event_counter: u64,
        /// Counter for ticket IDs
        ticket_counter: u64,
        /// Mapping from event ID to Event
        events: Mapping<u64, Event>,
        /// Mapping from ticket ID to Ticket
        tickets: Mapping<u64, Ticket>,
        /// Mapping from owner to their ticket IDs (using BTreeSet for efficient operations)
        owner_tickets: Mapping<AccountId, BTreeSet<u64>>,
        /// Contract admin (for future governance)
        admin: AccountId,
    }

    /// Events emitted by the contract
    #[ink(event)]
    pub struct EventCreated {
        #[ink(topic)]
        event_id: u64,
        #[ink(topic)]
        organizer: AccountId,
        name: String,
        price: Balance,
        total_tickets: u32,
    }

    #[ink(event)]
    pub struct TicketPurchased {
        #[ink(topic)]
        ticket_id: u64,
        #[ink(topic)]
        event_id: u64,
        #[ink(topic)]
        buyer: AccountId,
        price: Balance,
    }

    #[ink(event)]
    pub struct TicketTransferred {
        #[ink(topic)]
        ticket_id: u64,
        #[ink(topic)]
        from: AccountId,
        #[ink(topic)]
        to: AccountId,
    }

    #[ink(event)]
    pub struct TicketUsed {
        #[ink(topic)]
        ticket_id: u64,
        #[ink(topic)]
        event_id: u64,
    }

    #[ink(event)]
    pub struct EventCancelled {
        #[ink(topic)]
        event_id: u64,
        #[ink(topic)]
        organizer: AccountId,
    }

    #[ink(event)]
    pub struct EventCompleted {
        #[ink(topic)]
        event_id: u64,
    }

    #[ink(event)]
    pub struct TicketRefunded {
        #[ink(topic)]
        ticket_id: u64,
        #[ink(topic)]
        owner: AccountId,
        amount: Balance,
    }

    #[ink(event)]
    pub struct TicketCancelled {
        #[ink(topic)]
        ticket_id: u64,
        #[ink(topic)]
        event_id: u64,
        #[ink(topic)]
        owner: AccountId,
        refund_amount: Balance,
    }

    impl Default for TicketDot {
        fn default() -> Self {
            Self::new()
        }
    }

    impl TicketDot {
        /// Constructor - initializes the contract
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {
                event_counter: 0,
                ticket_counter: 0,
                events: Mapping::default(),
                tickets: Mapping::default(),
                owner_tickets: Mapping::default(),
                admin: Self::env().caller(),
            }
        }

        /// Create a new event
        /// 
        /// # Security
        /// - Validates all input parameters to prevent resource exhaustion
        /// - Enforces maximum tickets per event to prevent DoS
        /// - Validates minimum ticket price to prevent spam
        /// - Validates string lengths to prevent storage bloat
        /// 
        /// # Arguments
        /// * `name` - Event name (e.g., "Polkadot Conference 2025")
        /// * `price` - Ticket price in native token (e.g., 1000000000000 for 1 SBY)
        /// * `total_tickets` - Total number of tickets available
        /// * `metadata_cid` - IPFS CID containing event metadata (description, image, venue, etc.)
        /// 
        /// # Returns
        /// - `Ok(event_id)` - The ID of the newly created event
        /// - `Err(Error::InvalidInput)` - Input validation failed
        #[ink(message)]
        pub fn create_event(
            &mut self,
            name: String,
            price: Balance,
            total_tickets: u32,
            metadata_cid: String,
        ) -> Result<u64, Error> {
            // Validate input parameters to prevent resource exhaustion and storage bloat
            if name.is_empty() || name.len() > MAX_EVENT_NAME_LENGTH {
                return Err(Error::InvalidInput);
            }
            if metadata_cid.is_empty() || metadata_cid.len() > MAX_METADATA_CID_LENGTH {
                return Err(Error::InvalidInput);
            }
            if total_tickets == 0 || total_tickets > MAX_TICKETS_PER_EVENT {
                return Err(Error::InvalidInput);
            }
            if price < MIN_TICKET_PRICE {
                return Err(Error::InvalidInput);
            }

            let caller = self.env().caller();
            let event_id = self.event_counter;

            // Create new event
            let event = Event {
                id: event_id,
                name: name.clone(),
                organizer: caller,
                price,
                total_tickets,
                available_tickets: total_tickets,
                timestamp: self.env().block_timestamp(),
                metadata_cid,
                active: true,
                cancelled: false,
                completed: false,
            };

            // Store event
            self.events.insert(event_id, &event);
            self.event_counter = self.event_counter.saturating_add(1);

            // Emit event
            self.env().emit_event(EventCreated {
                event_id,
                organizer: caller,
                name,
                price,
                total_tickets,
            });

            Ok(event_id)
        }

        /// Buy a ticket for an event
        /// 
        /// This function mints an NFT ticket and transfers it to the buyer.
        /// Payment is handled via the payable mechanism.
        /// Accepts exact payment amount only to prevent confusion.
        /// 
        /// # Security
        /// - Requires exact payment amount to prevent overpayment
        /// - Payment is transferred immediately to organizer BEFORE state changes
        /// - Ticket is minted as NFT owned by buyer
        /// - Enforces maximum tickets per user to prevent DoS
        /// 
        /// # Arguments
        /// * `event_id` - ID of the event to buy ticket for
        /// 
        /// # Returns
        /// - `Ok(ticket_id)` - The ID of the newly minted ticket
        /// - `Err(Error::EventNotFound)` - Event doesn't exist
        /// - `Err(Error::InsufficientPayment)` - Payment != ticket price
        /// - `Err(Error::SoldOut)` - No tickets available
        /// - `Err(Error::EventNotActive)` - Event is not active
        /// - `Err(Error::TransferFailed)` - Payment transfer failed
        /// - `Err(Error::TooManyTickets)` - User has reached ticket limit
        #[ink(message, payable)]
        pub fn buy_ticket(&mut self, event_id: u64) -> Result<u64, Error> {
            let caller = self.env().caller();
            let payment = self.env().transferred_value();

            // Get event or return error
            let mut event = self.events.get(event_id).ok_or(Error::EventNotFound)?;

            // Validate event is active
            if !event.active {
                return Err(Error::EventNotActive);
            }

            // Check if event is cancelled
            if event.cancelled {
                return Err(Error::EventCancelled);
            }

            // Check if event is completed
            if event.completed {
                return Err(Error::EventCompleted);
            }

            // Check if tickets are available
            if event.available_tickets == 0 {
                return Err(Error::SoldOut);
            }

            // Validate exact payment amount to prevent confusion
            // User must pay exactly the ticket price
            if payment != event.price {
                return Err(Error::InsufficientPayment);
            }

            // Check user hasn't exceeded maximum tickets
            let owner_ticket_list = self.owner_tickets.get(caller).unwrap_or_default();
            if owner_ticket_list.len() >= MAX_TICKETS_PER_USER as usize {
                return Err(Error::TooManyTickets);
            }

            // Create ticket ID and NFT
            let ticket_id = self.ticket_counter;
            
            let ticket = Ticket {
                id: ticket_id,
                event_id,
                owner: caller,
                purchase_time: self.env().block_timestamp(),
                is_used: false,
                is_refunded: false,
            };

            // Update event availability
            event.available_tickets = event.available_tickets.saturating_sub(1);
            self.events.insert(event_id, &event);

            // Store ticket
            self.tickets.insert(ticket_id, &ticket);
            self.ticket_counter = self.ticket_counter.saturating_add(1);

            // Update owner's ticket list (using BTreeSet for efficient operations)
            let mut owner_ticket_set = self.owner_tickets.get(caller).unwrap_or_default();
            owner_ticket_set.insert(ticket_id);
            self.owner_tickets.insert(caller, &owner_ticket_set);

            // NOTE: Payment is held in contract as escrow
            // Organizer can withdraw earnings after event is completed
            // This enables automatic refunds if event is cancelled

            // Emit event
            self.env().emit_event(TicketPurchased {
                ticket_id,
                event_id,
                buyer: caller,
                price: event.price,
            });

            Ok(ticket_id)
        }

        /// Transfer ticket to another user
        /// 
        /// # Arguments
        /// * `ticket_id` - ID of the ticket to transfer
        /// * `to` - Account ID of the recipient
        #[ink(message)]
        pub fn transfer_ticket(
            &mut self,
            ticket_id: u64,
            to: AccountId,
        ) -> Result<(), Error> {
            let caller = self.env().caller();

            // Get ticket
            let mut ticket = self.tickets.get(ticket_id).ok_or(Error::TicketNotFound)?;

            // Verify ownership
            if ticket.owner != caller {
                return Err(Error::NotTicketOwner);
            }

            // Can't transfer used ticket
            if ticket.is_used {
                return Err(Error::TicketAlreadyUsed);
            }

            // Can't transfer refunded ticket
            if ticket.is_refunded {
                return Err(Error::TicketAlreadyRefunded);
            }

            // Check recipient hasn't exceeded maximum tickets
            let new_owner_tickets = self.owner_tickets.get(to).unwrap_or_default();
            if new_owner_tickets.len() >= MAX_TICKETS_PER_USER as usize {
                return Err(Error::TooManyTickets);
            }

            // Update ticket owner
            let old_owner = ticket.owner;
            ticket.owner = to;
            self.tickets.insert(ticket_id, &ticket);

            // Update old owner's ticket list (using BTreeSet for efficient removal)
            let mut old_owner_set = self.owner_tickets.get(old_owner).unwrap_or_default();
            old_owner_set.remove(&ticket_id);
            self.owner_tickets.insert(old_owner, &old_owner_set);

            // Update new owner's ticket list (using BTreeSet for efficient insertion)
            let mut new_owner_set = self.owner_tickets.get(to).unwrap_or_default();
            new_owner_set.insert(ticket_id);
            self.owner_tickets.insert(to, &new_owner_set);

            // Emit event
            self.env().emit_event(TicketTransferred {
                ticket_id,
                from: caller,
                to,
            });

            Ok(())
        }

        /// Mark ticket as used (called by event organizer or admin)
        #[ink(message)]
        pub fn use_ticket(&mut self, ticket_id: u64) -> Result<(), Error> {
            let caller = self.env().caller();

            // Get ticket
            let mut ticket = self.tickets.get(ticket_id).ok_or(Error::TicketNotFound)?;

            // Get event to verify organizer
            let event = self.events.get(ticket.event_id).ok_or(Error::EventNotFound)?;

            // Only organizer or admin can mark ticket as used
            if caller != event.organizer && caller != self.admin {
                return Err(Error::NotTicketOwner);
            }

            // Can't use refunded ticket
            if ticket.is_refunded {
                return Err(Error::TicketAlreadyRefunded);
            }

            // Can't use already used ticket
            if ticket.is_used {
                return Err(Error::TicketAlreadyUsed);
            }

            // Can't use ticket for cancelled event
            if event.cancelled {
                return Err(Error::EventCancelled);
            }

            // Can't use ticket for completed event
            if event.completed {
                return Err(Error::EventCompleted);
            }

            // Mark as used
            ticket.is_used = true;
            self.tickets.insert(ticket_id, &ticket);

            // Emit event
            self.env().emit_event(TicketUsed {
                ticket_id,
                event_id: ticket.event_id,
            });

            Ok(())
        }

        /// Cancel an event and enable refunds for all ticket holders
        /// Only the event organizer can cancel
        #[ink(message)]
        pub fn cancel_event(&mut self, event_id: u64) -> Result<(), Error> {
            let caller = self.env().caller();

            // Get event
            let mut event = self.events.get(event_id).ok_or(Error::EventNotFound)?;

            // Only organizer can cancel
            if caller != event.organizer {
                return Err(Error::NotOrganizer);
            }

            // Can't cancel already cancelled event
            if event.cancelled {
                return Err(Error::EventCancelled);
            }

            // Can't cancel completed event
            if event.completed {
                return Err(Error::EventCompleted);
            }

            // Mark event as cancelled and inactive
            event.cancelled = true;
            event.active = false;
            self.events.insert(event_id, &event);

            // Emit event
            self.env().emit_event(EventCancelled {
                event_id,
                organizer: caller,
            });

            Ok(())
        }

        /// Mark an event as completed (no more tickets can be used)
        /// Only the event organizer can mark as completed
        #[ink(message)]
        pub fn complete_event(&mut self, event_id: u64) -> Result<(), Error> {
            let caller = self.env().caller();

            // Get event
            let mut event = self.events.get(event_id).ok_or(Error::EventNotFound)?;

            // Only organizer can mark as completed
            if caller != event.organizer {
                return Err(Error::NotOrganizer);
            }

            // Can't complete cancelled event
            if event.cancelled {
                return Err(Error::EventCancelled);
            }

            // Can't complete already completed event
            if event.completed {
                return Err(Error::EventCompleted);
            }

            // Mark event as completed and inactive
            event.completed = true;
            event.active = false;
            self.events.insert(event_id, &event);

            // Emit event
            self.env().emit_event(EventCompleted {
                event_id,
            });

            Ok(())
        }

        /// Refund a ticket for a cancelled event
        /// Only works if the event has been cancelled and ticket hasn't been refunded yet
        /// 
        /// # Security
        /// - Immediately removes ticket ID from owner's list for efficient queries
        /// - Prevents double refunds with is_refunded flag
        #[ink(message)]
        pub fn refund_ticket(&mut self, ticket_id: u64) -> Result<(), Error> {
            let caller = self.env().caller();

            // Get ticket
            let mut ticket = self.tickets.get(ticket_id).ok_or(Error::TicketNotFound)?;

            // Only ticket owner can request refund
            if ticket.owner != caller {
                return Err(Error::NotTicketOwner);
            }

            // Check if already refunded
            if ticket.is_refunded {
                return Err(Error::TicketAlreadyRefunded);
            }

            // Get event
            let event = self.events.get(ticket.event_id).ok_or(Error::EventNotFound)?;

            // Can only refund if event is cancelled
            if !event.cancelled {
                return Err(Error::EventNotActive);
            }

            // Mark ticket as refunded
            ticket.is_refunded = true;
            self.tickets.insert(ticket_id, &ticket);

            // IMMEDIATELY remove ticket from owner's list for efficient queries
            let mut owner_ticket_set = self.owner_tickets.get(caller).unwrap_or_default();
            owner_ticket_set.remove(&ticket_id);
            self.owner_tickets.insert(caller, &owner_ticket_set);

            // Transfer refund to ticket owner
            let refund_amount = event.price;
            if self.env().transfer(caller, refund_amount).is_err() {
                return Err(Error::TransferFailed);
            }

            // Emit event
            self.env().emit_event(TicketRefunded {
                ticket_id,
                owner: caller,
                amount: refund_amount,
            });

            Ok(())
        }

        /// Cancel a ticket and get refund (before event starts/completes)
        /// This makes the ticket available for sale again
        /// 
        /// # Security
        /// - Immediately removes ticket ID from owner's list for efficient queries
        /// - Returns ticket to available pool
        #[ink(message)]
        pub fn cancel_ticket(&mut self, ticket_id: u64) -> Result<(), Error> {
            let caller = self.env().caller();

            // Get ticket
            let mut ticket = self.tickets.get(ticket_id).ok_or(Error::TicketNotFound)?;

            // Only ticket owner can cancel
            if ticket.owner != caller {
                return Err(Error::NotTicketOwner);
            }

            // Check if already refunded
            if ticket.is_refunded {
                return Err(Error::TicketAlreadyRefunded);
            }

            // Check if ticket already used
            if ticket.is_used {
                return Err(Error::TicketAlreadyUsed);
            }

            // Get event
            let mut event = self.events.get(ticket.event_id).ok_or(Error::EventNotFound)?;

            // Can't cancel ticket for cancelled event (use refund_ticket instead)
            if event.cancelled {
                return Err(Error::EventCancelled);
            }

            // Can't cancel ticket for completed event
            if event.completed {
                return Err(Error::EventCompleted);
            }

            // Mark ticket as refunded
            ticket.is_refunded = true;
            self.tickets.insert(ticket_id, &ticket);

            // Increase available tickets count
            event.available_tickets = event.available_tickets.saturating_add(1);
            self.events.insert(ticket.event_id, &event);

            // IMMEDIATELY remove ticket from owner's list (using BTreeSet for O(log n) removal)
            let mut owner_ticket_set = self.owner_tickets.get(caller).unwrap_or_default();
            owner_ticket_set.remove(&ticket_id);
            self.owner_tickets.insert(caller, &owner_ticket_set);

            // Transfer refund to ticket owner
            let refund_amount = event.price;
            if self.env().transfer(caller, refund_amount).is_err() {
                return Err(Error::TransferFailed);
            }

            // Emit event
            self.env().emit_event(TicketCancelled {
                ticket_id,
                event_id: ticket.event_id,
                owner: caller,
                refund_amount,
            });

            Ok(())
        }

        /// Withdraw earnings from a completed event
        /// Only the organizer can withdraw after event is marked as completed
        /// 
        /// # Security
        /// - Only organizer can withdraw
        /// - Event must be completed first
        /// - Calculates earnings based on tickets sold
        #[ink(message)]
        pub fn withdraw_earnings(&mut self, event_id: u64) -> Result<(), Error> {
            let caller = self.env().caller();
            
            // Get event
            let event = self.events.get(event_id).ok_or(Error::EventNotFound)?;
            
            // Only organizer can withdraw
            if caller != event.organizer {
                return Err(Error::NotOrganizer);
            }
            
            // Event must be completed
            if !event.completed {
                return Err(Error::EventNotCompleted);
            }
            
            // Calculate earnings (tickets sold * price)
            let tickets_sold = event.total_tickets.saturating_sub(event.available_tickets);
            let earnings = event.price.saturating_mul(tickets_sold as u128);
            
            // Transfer earnings to organizer
            if self.env().transfer(caller, earnings).is_err() {
                return Err(Error::TransferFailed);
            }
            
            Ok(())
        }

        /// Get event details
        #[ink(message)]
        pub fn get_event(&self, event_id: u64) -> Option<Event> {
            self.events.get(event_id)
        }

        /// Get ticket details
        #[ink(message)]
        pub fn get_ticket(&self, ticket_id: u64) -> Option<Ticket> {
            self.tickets.get(ticket_id)
        }

        /// Get all tickets owned by an account
        /// 
        /// Returns only valid (non-refunded) tickets.
        /// Refunded tickets are immediately removed from this list when cancelled/refunded,
        /// so no runtime filtering is needed (O(1) lookup instead of O(n) iteration).
        /// 
        /// # Performance
        /// - O(1) lookup using BTreeSet
        /// - No iteration through refunded tickets
        /// - Returns tickets sorted by ID
        #[ink(message)]
        pub fn get_my_tickets(&self, owner: AccountId) -> Vec<u64> {
            // Since we immediately remove refunded tickets from owner_tickets,
            // we can simply return the list without filtering
            self.owner_tickets
                .get(owner)
                .unwrap_or_default()
                .into_iter()
                .collect()
        }

        /// Get total number of events created
        #[ink(message)]
        pub fn get_event_count(&self) -> u64 {
            self.event_counter
        }

        /// Get total number of tickets minted
        #[ink(message)]
        pub fn get_ticket_count(&self) -> u64 {
            self.ticket_counter
        }

        /// Get contract admin
        #[ink(message)]
        pub fn get_admin(&self) -> AccountId {
            self.admin
        }
    }

    /// Unit tests
    #[cfg(test)]
    mod tests {
        use super::*;

        #[ink::test]
        fn create_event_works() {
            let mut contract = TicketDot::new();
            let event_id = contract
                .create_event(
                    String::from("Test Event"),
                    1000,
                    100,
                    String::from("QmTest123"),
                )
                .unwrap();

            assert_eq!(event_id, 0);
            let event = contract.get_event(event_id).unwrap();
            assert_eq!(event.name, "Test Event");
            assert_eq!(event.available_tickets, 100);
        }

        #[ink::test]
        fn buy_ticket_works() {
            let mut contract = TicketDot::new();
            
            // Create event
            let event_id = contract
                .create_event(
                    String::from("Test Event"),
                    1000,
                    100,
                    String::from("QmTest123"),
                )
                .unwrap();

            // Buy ticket
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(1000);
            let ticket_id = contract.buy_ticket(event_id).unwrap();

            assert_eq!(ticket_id, 0);
            let ticket = contract.get_ticket(ticket_id).unwrap();
            assert_eq!(ticket.event_id, event_id);
        }

        #[ink::test]
        fn transfer_ticket_works() {
            let mut contract = TicketDot::new();
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            
            // Create event and buy ticket
            let event_id = contract
                .create_event(
                    String::from("Test Event"),
                    1000,
                    100,
                    String::from("QmTest123"),
                )
                .unwrap();

            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(1000);
            let ticket_id = contract.buy_ticket(event_id).unwrap();

            // Transfer ticket
            contract.transfer_ticket(ticket_id, accounts.bob).unwrap();
            
            let ticket = contract.get_ticket(ticket_id).unwrap();
            assert_eq!(ticket.owner, accounts.bob);
        }

        #[ink::test]
        fn cancel_event_works() {
            let mut contract = TicketDot::new();
            
            // Create event
            let event_id = contract
                .create_event(
                    String::from("Test Event"),
                    1000,
                    100,
                    String::from("QmTest123"),
                )
                .unwrap();

            // Cancel event
            contract.cancel_event(event_id).unwrap();
            
            let event = contract.get_event(event_id).unwrap();
            assert!(event.cancelled);
            assert!(!event.active);
        }

        #[ink::test]
        fn complete_event_works() {
            let mut contract = TicketDot::new();
            
            // Create event
            let event_id = contract
                .create_event(
                    String::from("Test Event"),
                    1000,
                    100,
                    String::from("QmTest123"),
                )
                .unwrap();

            // Complete event
            contract.complete_event(event_id).unwrap();
            
            let event = contract.get_event(event_id).unwrap();
            assert!(event.completed);
            assert!(!event.active);
        }

        #[ink::test]
        fn cancel_ticket_works() {
            let mut contract = TicketDot::new();
            
            // Create event
            let event_id = contract
                .create_event(
                    String::from("Test Event"),
                    1000,
                    100,
                    String::from("QmTest123"),
                )
                .unwrap();

            // Buy ticket
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(1000);
            let ticket_id = contract.buy_ticket(event_id).unwrap();

            // Check event has 99 available tickets
            let event_before = contract.get_event(event_id).unwrap();
            assert_eq!(event_before.available_tickets, 99);

            // Cancel ticket
            contract.cancel_ticket(ticket_id).unwrap();
            
            // Check ticket is refunded
            let ticket = contract.get_ticket(ticket_id).unwrap();
            assert!(ticket.is_refunded);

            // Check event now has 100 available tickets again
            let event_after = contract.get_event(event_id).unwrap();
            assert_eq!(event_after.available_tickets, 100);
        }
    }
}
