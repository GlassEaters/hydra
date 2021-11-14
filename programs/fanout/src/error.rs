use anchor_lang::prelude::*;

#[error]
pub enum ErrorCode {
  #[msg("Encountered an arithmetic error")]
  BadArtithmetic,
  
  #[msg("Invalid authority")]
  InvalidAuthority
}