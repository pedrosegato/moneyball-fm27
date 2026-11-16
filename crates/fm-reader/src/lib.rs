pub mod build;
pub mod fm;
pub mod memory;
pub mod rtti;
pub mod sanity;

pub use fm::{
    ClubFinances, ClubRef, Currency, Game, Money, PlayerRecord, Scope, Snapshot, Tactic, WagePeriod,
};
pub use memory::{
    chunks, FakeMemory, MemoryExt, MemorySource, Module, Ptr, ReaderError, Region, Result,
};

#[cfg(windows)]
pub mod live;

#[cfg(windows)]
pub use live::LiveProcess;
