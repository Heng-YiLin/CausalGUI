import React, { useState } from "react";
import {Menu, MenuProps} from "antd";
import { AppstoreOutlined, MailOutlined, SettingOutlined } from '@ant-design/icons';
interface HeaderProps {
  brandText?: string; // Optional prop, define as needed
}
type MenuItem = Required<MenuProps>['items'][number];


const items: MenuItem[] = [
  {
    label: 'Home',
    key: 'mail',
    icon: <AppstoreOutlined />,
  },
  {
    label: 'Navigation Two',
    key: 'app',
    icon: <AppstoreOutlined />,
  },
];

const Header: React.FC<HeaderProps> = () => {
  return (
    <Menu  mode="horizontal" items={items} />
  );
};

export default Header;
