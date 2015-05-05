## GPIO-HOWTO.md

### Summary
Accessing the GPIO pins through sysfs with mainline kernel

The GPIO pins can be accessed from user space using sysfs.

To enable this you need the following kernel option enabled: CONFIG_GPIO_SYSFS

```Device Drivers  ---> GPIO Support  ---> /sys/class/gpio/... (sysfs interface)```

To access a GPIO pin you first need to export it with

```echo XX > /sys/class/gpio/export```

with XX being the number of the desired pin.

To obtain the correct number you have to calculate it from the pin name (like PH18)[1]:

```(position of letter in alphabet - 1) * 32 + pin number```

### Example
E.g for PH18 this would be

```( 8 - 1) * 32 + 18 = 224 + 18 = 242``` (since 'h' is the 8th letter).

Therefore, to enable PH18 you would run

```echo 242 > /sys/class/gpio/export```

### Using
After you have successfully exported the pin you can access it through ```/sys/class/gpio/gpio*NUMBER*``` (in case of PH18 it's ```/sys/class/gpio/gpio242```).

With ```/sys/class/gpio/gpio*NUMBER*/direction``` you can set the pin to ***out*** or ***in*** using

```echo "out" > /sys/class/gpio/gpio*NUMBER*/direction```

and you can read/write the value with ```/sys/class/gpio/gpio*NUMBER*/value```

### Cleanup

When you are done, unexport the pin with

```echo XX > /sys/class/gpio/unexport```
