// use std::net::{SocketAddr, IpAddr, Ipv4Addr};
// use std::time::Duration;

// pub async fn is_port_open(port: u16) -> bool {
//     let addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), port);
//     tokio::time::timeout(Duration::from_secs(1), tokio::net::TcpStream::connect(addr))
//         .await
//         .map(|res| res.is_ok())
//         .unwrap_or(false)
// }