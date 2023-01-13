use {
    anchor_lang::prelude::*,
    clockwork_sdk::{
        state::{Thread, ThreadAccount, ThreadResponse},
    },
};
#[derive(Accounts)]
#[instruction(name: String)]
pub struct HelloWorld<'info> {
    #[account(address = hello_thread.pubkey(), signer)]
    pub hello_thread: Account<'info, Thread>,
}

pub fn handler(_ctx: Context<HelloWorld>, name: String) -> Result<ThreadResponse> {
    msg!(
        "Hello {}! The current time is: {}",
        name,
        Clock::get().unwrap().unix_timestamp
    );

    Ok(ThreadResponse {
        next_instruction: None,
        kickoff_instruction: None,
    })
}
